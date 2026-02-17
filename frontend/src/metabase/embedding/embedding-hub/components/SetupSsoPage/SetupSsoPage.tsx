/* eslint-disable metabase/no-literal-metabase-strings */
import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { t } from "ttag";

import { useUpdateSettingsMutation } from "metabase/api";
import { useGetEmbeddingHubChecklistQuery } from "metabase/api/embedding-hub";
import { OnboardingStepper } from "metabase/common/components/OnboardingStepper";
import type { OnboardingStepperHandle } from "metabase/common/components/OnboardingStepper/types";
import { useToast } from "metabase/common/hooks";
import { UtilApi } from "metabase/services";
import {
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

  const [jwtIdentityProviderUri, setJwtIdentityProviderUri] = useState("");
  const [uriError, setUriError] = useState<string | null>(null);

  const isSsoConfigured = checklist?.["secure-embeds"] ?? false;

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

  const completedSteps = useMemo(() => {
    return {
      "setup-jwt": isSsoConfigured,
      "add-endpoint": false,
      "test-jwt": false,
    };
  }, [isSsoConfigured]);

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
            <Text size="md" c="text-secondary" lh="lg">
              {t`Add a new endpoint to your app to handle JWT authentication.`}
            </Text>
          </Stack>
        </OnboardingStepper.Step>

        <OnboardingStepper.Step
          stepId="test-jwt"
          title={t`Test that JWT authentication is working correctly`}
        >
          <Stack gap="lg">
            <Text size="md" c="text-secondary" lh="lg">
              {t`Verify that your JWT authentication setup is working correctly.`}
            </Text>
          </Stack>
        </OnboardingStepper.Step>
      </OnboardingStepper>
    </Stack>
  );
};
