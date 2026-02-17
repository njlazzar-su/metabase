/* eslint-disable metabase/no-literal-metabase-strings */
import { useMemo, useRef } from "react";
import { Link } from "react-router";
import { t } from "ttag";

import { OnboardingStepper } from "metabase/common/components/OnboardingStepper";
import type { OnboardingStepperHandle } from "metabase/common/components/OnboardingStepper/types";
import { Group, Icon, Stack, Text, Title } from "metabase/ui";

import S from "./SetupSsoPage.module.css";

const SETUP_GUIDE_PATH = "/admin/embedding/setup-guide";

export const SetupSsoPage = () => {
  const stepperRef = useRef<OnboardingStepperHandle>(null);

  const completedSteps = useMemo(() => {
    return {
      "setup-jwt": false,
      "add-endpoint": false,
      "test-jwt": false,
    };
  }, []);

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
