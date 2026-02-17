import cx from "classnames";
import { t } from "ttag";

import CS from "metabase/css/core/index.css";
import { Flex } from "metabase/ui";
import { color } from "metabase/ui/utils/colors";
import type { Card, DashboardCard } from "metabase-types/api";

import { isQuestionDashCard } from "../../../utils";

import { DashCardCardParameterMapperConnected } from "./DashCardCardParameterMapper";
import S from "./DashCardParameterMapper.module.css";

type DashCardParameterMapperProps = {
  dashcard: DashboardCard;
  isMobile: boolean;
  compact?: boolean;
};

function isCard(card: DashboardCard["card"]): card is Card {
  return typeof card.id === "number";
}

export const DashCardParameterMapper = ({
  dashcard,
  isMobile,
  compact = false,
}: DashCardParameterMapperProps) => {
  const cards = (
    isQuestionDashCard(dashcard)
      ? [dashcard.card, ...(dashcard.series ?? [])]
      : [dashcard.card]
  ).filter(isCard);

  return (
    <div
      className={cx(
        CS.relative,
        CS.flexFull,
        CS.flex,
        CS.flexColumn,
        CS.layoutCentered,
      )}
    >
      {isQuestionDashCard(dashcard) && !!dashcard.series?.length && (
        <div
          className={cx(CS.mx4, CS.my1, CS.p1, CS.rounded, CS.textMedium)}
          style={{
            backgroundColor: color("background-secondary"),
            marginTop: -10,
          }}
        >
          {t`Make sure to make a selection for each series, or the filter won't work on this card.`}
        </div>
      )}
      <Flex
        justify="space-around"
        maw="100%"
        m={compact ? undefined : "0 2rem"}
        gap="sm"
        className={S.MapperSettingsContainer}
        data-testid="parameter-mapper-container"
      >
        {cards.map((card) => (
          <DashCardCardParameterMapperConnected
            key={`${dashcard.id},${card.id}`}
            dashcard={dashcard}
            card={card}
            isMobile={isMobile}
            compact={compact}
          />
        ))}
      </Flex>
    </div>
  );
};
