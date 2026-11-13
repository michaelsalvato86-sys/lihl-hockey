// LihlHUD.h  NOT COMPILED, NOT RUN. Scoreboard HUD, C++ only (no UMG asset needed): the widget builds its own tree in NativeOnInitialized.
// Shows home/away abbreviations, score, period and clock from ALihlGameMode. Colors come from FLihlTeamRow (LihlHexToColor).
// TODO(verify on compile): WidgetTree->ConstructWidget usage and UCanvasPanelSlot anchors in a UUserWidget created from C++ only.
#pragma once
#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "GameFramework/HUD.h"
#include "LihlHUD.generated.h"

class UTextBlock;

UCLASS()
class LIHL_UE5_HOCKEY_POC_API ULihlScoreboardWidget : public UUserWidget
{
	GENERATED_BODY()
public:
	void SetTeams(const FString& HomeAbbr, const FString& AwayAbbr, const FLinearColor& HomeColor, const FLinearColor& AwayColor);
	void SetState(int32 HomeScore, int32 AwayScore, int32 Period, float ClockSeconds);
protected:
	virtual void NativeOnInitialized() override;
	UPROPERTY() TObjectPtr<UTextBlock> HomeText;
	UPROPERTY() TObjectPtr<UTextBlock> AwayText;
	UPROPERTY() TObjectPtr<UTextBlock> ClockText;
	FString HomeAbbr_ = TEXT("HOME"), AwayAbbr_ = TEXT("AWAY");
};

UCLASS()
class LIHL_UE5_HOCKEY_POC_API ALihlHUD : public AHUD
{
	GENERATED_BODY()
public:
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
protected:
	UPROPERTY() TObjectPtr<ULihlScoreboardWidget> Scoreboard;
};
