/* eslint-disable metabase/no-literal-metabase-strings */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { jt, t } from "ttag";

import { useUpdateSettingsMutation } from "metabase/api";
import { useGetEmbeddingHubChecklistQuery } from "metabase/api/embedding-hub";
import { CopyButton } from "metabase/common/components/CopyButton";
import { OnboardingStepper } from "metabase/common/components/OnboardingStepper";
import type { OnboardingStepperHandle } from "metabase/common/components/OnboardingStepper/types";
import { useDocsUrl, useSetting, useToast } from "metabase/common/hooks";
import { useHelpUrl } from "metabase/embedding/embedding-hub/hooks";
import { UtilApi } from "metabase/services";
import {
  Anchor,
  Button,
  Group,
  Icon,
  Stack,
  Text,
  TextInput,
  Title,
} from "metabase/ui";

import S from "./SetupSsoPage.module.css";

const SETUP_GUIDE_PATH = "/admin/embedding/setup-guide";

export const SetupSsoPage = () => {
  const stepperRef = useRef<OnboardingStepperHandle>(null);
  const [sendToast] = useToast();

  const { data: checklist } = useGetEmbeddingHubChecklistQuery();
  const [updateSettings, { isLoading: isUpdatingSettings }] =
    useUpdateSettingsMutation();

  const jwtSharedSecret = useSetting("jwt-shared-secret");
  const existingJwtIdentityProviderUri = useSetting(
    "jwt-identity-provider-uri",
  );

  // This iframe is a placeholder url for the JWT-specific docs.
  // TODO(EMB-1337): replace this with standalone JWT backend docs page.
  const { url: jwtDocsUrl, showMetabaseLinks } = useDocsUrl(
    "embedding/authentication",
  );

  const jwtDocsIframeUrl = `${jwtDocsUrl}?hide_nav=true&no_gdpr=true`;

  const [jwtIdentityProviderUri, setJwtIdentityProviderUri] = useState("");

  const [uriError, setUriError] = useState<string | null>(null);

  // Initialize with existing IdP URL if available
  useEffect(() => {
    if (existingJwtIdentityProviderUri) {
      setJwtIdentityProviderUri(existingJwtIdentityProviderUri);
    }
  }, [existingJwtIdentityProviderUri]);

  // UI-only state for step 2, similar to isStrategyConfirmed in permissions page
  const [isAddEndpointConfirmed, setIsAddEndpointConfirmed] = useState(false);

  // State for step 3 troubleshooting view
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const isSsoConfigured = checklist?.["sso-configured"] ?? false;
  const isSsoAuthManualTested = checklist?.["sso-auth-manual-tested"] ?? false;

  const handleEnableJwtAuthentication = useCallback(async () => {
    // Validate the URI field
    if (!jwtIdentityProviderUri.trim()) {
      setUriError(t`JWT Identity Provider URI is required`);
      return;
    }

    setUriError(null);

    try {
      // Generate a random token for jwt-shared-secret
      const { token } = await UtilApi.random_token();

      // Update all JWT settings at once
      await updateSettings({
        "jwt-identity-provider-uri": jwtIdentityProviderUri.trim(),
        "jwt-shared-secret": token,
        "jwt-enabled": true,
        "jwt-group-sync": true,
      }).unwrap();

      // Move to the next step
      stepperRef.current?.goToNextStep();
    } catch (error) {
      sendToast({
        icon: "warning",
        toastColor: "error",
        message: t`Failed to enable JWT authentication`,
      });
    }
  }, [jwtIdentityProviderUri, updateSettings, sendToast]);

  const handleAddEndpointNext = useCallback(() => {
    setIsAddEndpointConfirmed(true);
    stepperRef.current?.goToNextStep();
  }, []);

  const handleLoginWorksDone = useCallback(async () => {
    try {
      await updateSettings({
        "embedding-hub-sso-auth-manual-tested": true,
      }).unwrap();
    } catch (error) {
      sendToast({
        icon: "warning",
        toastColor: "error",
        message: t`Failed to save SSO test status`,
      });
    }
  }, [updateSettings, sendToast]);

  const handleCouldNotLogIn = useCallback(() => {
    setShowTroubleshooting(true);
  }, []);

  const completedSteps = useMemo(() => {
    return {
      "setup-jwt": isSsoConfigured,
      "add-endpoint": isAddEndpointConfirmed || isSsoAuthManualTested,
      "test-jwt": isSsoAuthManualTested,
    };
  }, [isSsoConfigured, isAddEndpointConfirmed, isSsoAuthManualTested]);

  return (
    <Stack mx="auto" gap="sm" maw={680}>
      <Link to={SETUP_GUIDE_PATH} className={S.backLink}>
        <Group gap="xs">
          <Icon name="chevronleft" size={12} />
          <Text size="sm" c="text-secondary">{t`Back to the setup guide`}</Text>
        </Group>
      </Link>

      <Title order={1} c="text-primary" mb="xl">
        {t`Configure SSO`}
      </Title>

      <OnboardingStepper
        ref={stepperRef}
        completedSteps={completedSteps}
        lockedSteps={{}}
      >
        <OnboardingStepper.Step
          stepId="setup-jwt"
          title={t`Set up JWT authentication`}
        >
          <Stack gap="lg">
            <Text size="md" c="text-secondary" lh="lg">
              {t`You can connect Metabase to your identity provider using JSON Web Tokens (JWT) to authenticate people. Enabling JWT authentication will also create a signing key and enable group sync.`}
            </Text>

            <TextInput
              label={t`JWT Identity Provider URI`}
              description={t`This is where Metabase will redirect login requests`}
              placeholder="https://jwt.yourdomain.org"
              value={jwtIdentityProviderUri}
              onChange={(e) => {
                setJwtIdentityProviderUri(e.target.value);
                setUriError(null);
              }}
              error={uriError}
              required
            />

            <Group justify="flex-end">
              <Button
                variant="filled"
                onClick={handleEnableJwtAuthentication}
                loading={isUpdatingSettings}
              >
                {t`Enable JWT authentication and continue`}
              </Button>
            </Group>
          </Stack>
        </OnboardingStepper.Step>

        <OnboardingStepper.Step
          stepId="add-endpoint"
          title={t`Add a new endpoint to your app`}
        >
          <Stack gap="lg">
            <TextInput
              label={t`JWT Signing Key`}
              description={t`This secret is used to sign JWT tokens. Replace YOUR_SECRET_HERE in the below snippet with this value.`}
              value={jwtSharedSecret ?? ""}
              readOnly
              rightSection={<CopyButton value={jwtSharedSecret ?? ""} />}
              rightSectionWidth={40}
            />

            {showMetabaseLinks && (
              <iframe
                src={jwtDocsIframeUrl}
                title={t`JWT Authentication Documentation`}
                className={S.docsIframe}
              />
            )}

            {showMetabaseLinks && (
              <Text size="sm" c="text-secondary">
                {jt`You can view more examples in the ${(
                  <Anchor key="docs-link" href={jwtDocsUrl} target="_blank">
                    {t`docs`}
                  </Anchor>
                )}.`}
              </Text>
            )}

            <Group justify="flex-end">
              <Button variant="filled" onClick={handleAddEndpointNext}>
                {t`Next`}
              </Button>
            </Group>
          </Stack>
        </OnboardingStepper.Step>

        <OnboardingStepper.Step
          stepId="test-jwt"
          title={t`Test that JWT authentication is working correctly`}
          hideTitleOnActive
        >
          {showTroubleshooting ? (
            <SsoTroubleshootingView onLoginWorksDone={handleLoginWorksDone} />
          ) : (
            <Stack gap="lg">
              <Title
                order={3}
              >{t`Try logging in with SSO. Did it work?`}</Title>

              <Text size="md" c="text-secondary" lh="lg">
                {t`To check if JWT authentication was configured successfully, open Metabase in a different browser or in a private tab and try logging in to your account using single sign-on (SSO). Is login working correctly?`}
              </Text>

              <Group justify="flex-end">
                <Button variant="outline" onClick={handleCouldNotLogIn}>
                  {t`No, I couldn't log in`}
                </Button>
                <Button
                  component={Link}
                  to={SETUP_GUIDE_PATH}
                  variant="filled"
                  onClick={handleLoginWorksDone}
                >
                  {t`Log in works, I'm done`}
                </Button>
              </Group>
            </Stack>
          )}
        </OnboardingStepper.Step>
      </OnboardingStepper>
    </Stack>
  );
};

interface SsoTroubleshootingViewProps {
  onLoginWorksDone: () => void;
}

const SsoTroubleshootingView = ({
  onLoginWorksDone,
}: SsoTroubleshootingViewProps) => {
  const helpUrl = useHelpUrl();
  return (
    <Stack gap="lg">
      <Title order={3}>{t`Troubleshooting`}</Title>

      <Text size="md" c="text-secondary" lh="lg">
        {t`Try the steps below before testing JWT authentication again. If nothing works, consider contacting support.`}
      </Text>

      <Stack gap="md">
        <div>
          <Text fw={700} mb="xs">{t`404 error after SSO sign-in`}</Text>
          <Text size="md" c="text-secondary" lh="lg">
            {t`If after clicking on "Sign in with SSO", the browser returns a 404 error, make sure the value of the JWT SSO URI in admin settings / auth / JWT is pointing to your endpoint and your endpoint is up and running and available.`}
          </Text>
        </div>

        <div>
          <Text
            fw={700}
            mb="xs"
          >{t`JWT decryption error: "Message seems corrupt"`}</Text>
          <Text size="md" c="text-secondary" lh="lg">
            {t`If after being redirected from your app to Metabase, you see "Message seems corrupt or manipulated" there was an issue decrypting signed JWT. Ensure METABASE_JWT_SHARED_SECRET has the right value.`}
          </Text>
        </div>

        <div>
          <Text fw={700} mb="xs">{t`Tenant ID mismatch error`}</Text>
          <Text size="md" c="text-secondary" lh="lg">
            {t`If after being redirected from your app to Metabase, you see an error message "Tenant ID mismatch with existing user", your application is trying to sign in a the user with the wrong tenant slug. Review @tenant claim in the JWT and ensure it matches the tenant this tenant user belongs to.`}
          </Text>
        </div>

        <div>
          <Text
            fw={700}
            mb="xs"
          >{t`User provisioning disabled for JWT SSO`}</Text>
          <Text size="md" c="text-secondary" lh="lg">
            {t`If after being redirected from your app to Metabase, you see an error message "Sorry, but you'll need a $SITENAME account to view this page, contact your administrator. User provisioning is turned off for JWT SSO in admin settings/authentication. Either turn this feature on to have users be provisioned if they don't exist yet, or ensure users exist before signing them in via JWT SSO.`}
          </Text>
        </div>
      </Stack>

      <Group justify="flex-end">
        <Button component="a" href={helpUrl} target="_blank" variant="outline">
          {t`Contact customer support`}
        </Button>
        <Button
          component={Link}
          to={SETUP_GUIDE_PATH}
          variant="filled"
          onClick={onLoginWorksDone}
        >
          {t`Log in works, I'm done`}
        </Button>
      </Group>
    </Stack>
  );
};
