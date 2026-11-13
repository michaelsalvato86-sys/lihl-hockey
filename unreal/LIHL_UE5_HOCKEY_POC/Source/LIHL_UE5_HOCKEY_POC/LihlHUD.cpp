// LihlHUD.cpp  NOT COMPILED, NOT RUN.
#include "LihlHUD.h"
#include "Blueprint/WidgetTree.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/TextBlock.h"
#include "Engine/World.h"
#include "LihlGameMode.h"

void ULihlScoreboardWidget::NativeOnInitialized()
{
	Super::NativeOnInitialized();
	UCanvasPanel* Root = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(), TEXT("Root"));
	WidgetTree->RootWidget = Root;
	auto MakeText = [&](const TCHAR* Name, float X, float W) -> UTextBlock*
	{
		UTextBlock* T = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass(), Name);
		Root->AddChild(T);
		if (UCanvasPanelSlot* S = Cast<UCanvasPanelSlot>(T->Slot)) { S->SetAnchors(FAnchors(.5f, 0.f)); S->SetAlignment(FVector2D(.5f, 0.f)); S->SetPosition(FVector2D(X, 16.f)); S->SetSize(FVector2D(W, 48.f)); }
		return T;
	};
	HomeText = MakeText(TEXT("Home"), -220.f, 200.f);
	ClockText = MakeText(TEXT("Clock"), 0.f, 200.f);
	AwayText = MakeText(TEXT("Away"), 220.f, 200.f);
}

void ULihlScoreboardWidget::SetTeams(const FString& H, const FString& A, const FLinearColor& HC, const FLinearColor& AC)
{
	HomeAbbr_ = H; AwayAbbr_ = A;
	if (HomeText) HomeText->SetColorAndOpacity(FSlateColor(HC));
	if (AwayText) AwayText->SetColorAndOpacity(FSlateColor(AC));
}

void ULihlScoreboardWidget::SetState(int32 HS, int32 AS, int32 Period, float Clock)
{
	if (HomeText) HomeText->SetText(FText::FromString(FString::Printf(TEXT("%s %d"), *HomeAbbr_, HS)));
	if (AwayText) AwayText->SetText(FText::FromString(FString::Printf(TEXT("%d %s"), AS, *AwayAbbr_)));
	const int32 Sec = FMath::FloorToInt(Clock);
	if (ClockText) ClockText->SetText(FText::FromString(FString::Printf(TEXT("P%d  %d:%02d"), Period, Sec / 60, Sec % 60)));
}

void ALihlHUD::BeginPlay()
{
	Super::BeginPlay();
	if (APlayerController* PC = GetOwningPlayerController())
	{
		Scoreboard = CreateWidget<ULihlScoreboardWidget>(PC, ULihlScoreboardWidget::StaticClass());
		if (Scoreboard) Scoreboard->AddToViewport();
	}
}

void ALihlHUD::Tick(float Dt)
{
	Super::Tick(Dt);
	if (const ALihlGameMode* GM = GetWorld()->GetAuthGameMode<ALihlGameMode>())
		if (Scoreboard && GM->Score.Num() == 2) Scoreboard->SetState(GM->Score[0], GM->Score[1], GM->Period, GM->ClockSeconds);
}
