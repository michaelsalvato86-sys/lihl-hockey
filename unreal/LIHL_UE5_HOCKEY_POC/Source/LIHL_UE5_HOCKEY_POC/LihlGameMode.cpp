// LihlGameMode.cpp  NOT COMPILED, NOT RUN.
#include "LihlGameMode.h"
#include "Engine/DataTable.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "TimerManager.h"
#include "LihlBroadcastCamera.h"
#include "LihlCoords.h"
#include "LihlGoalie.h"
#include "LihlPuck.h"
#include "LihlRink.h"
#include "LihlSkater.h"
#include "LihlHUD.h"
#include "Data/LihlDataRows.h"

using namespace Lihl;

ALihlGameMode::ALihlGameMode()
{
	PrimaryActorTick.bCanEverTick = true;
	DefaultPawnClass = nullptr;          // skaters are spawned and possessed here
	HUDClass = ALihlHUD::StaticClass();
	SkaterClass = ALihlSkater::StaticClass();
	GoalieClass = ALihlGoalie::StaticClass();
	Score = { 0, 0 };
}

void ALihlGameMode::BeginPlay()
{
	Super::BeginPlay();
	ClockSeconds = PeriodSeconds;
	SpawnWorld();
	StartFaceoff();
}

void ALihlGameMode::SpawnWorld()
{
	UWorld* World = GetWorld();
	Rink = World->SpawnActor<ALihlRink>(FVector::ZeroVector, FRotator::ZeroRotator);
	Puck = World->SpawnActor<ALihlPuck>(FVector::ZeroVector, FRotator::ZeroRotator);
	World->SpawnActor<ALihlBroadcastCamera>(FVector::ZeroVector, FRotator::ZeroRotator);
	for (int32 Team = 0; Team < 2; ++Team)
	{
		FActorSpawnParameters P; P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		ALihlGoalie* G = World->SpawnActor<ALihlGoalie>(GoalieClass, FVector::ZeroVector, FRotator::ZeroRotator, P);
		G->TeamIndex = Team;
		G->State.x = (Team == 0) ? GX + 3.5f : W - GX - 3.5f;   // line 325: goalie x = ownGX + side*3.5 (side>0 left)
		for (int32 i = 0; i < SkatersPerSide; ++i)
		{
			// Faceoff-ish lines: spread across the team's own half. Real line deployment (lines 318-322, shifts) is NOT ported.
			const float X = W * .5f + ((Team == 0) ? -1.f : 1.f) * (12.f + 8.f * (i % 3));
			const float Y = MY + (i - SkatersPerSide / 2) * 9.f;
			ALihlSkater* S = World->SpawnActor<ALihlSkater>(SkaterClass, LihlCoords::SimToWorld(X, Y, 90.f), FRotator(0.f, (Team == 0) ? 0.f : 180.f, 0.f), P);
			S->TeamIndex = Team; S->SimX = X; S->SimY = Y;
			S->Skate.fa = (Team == 0) ? 0.f : PI_F;
			if (Team == 0 && i == 0) { S->bIsControlled = true; if (APlayerController* PC = World->GetFirstPlayerController()) PC->Possess(S); }
		}
	}
	ApplyTeamData(0, HomeTeamRow);
	ApplyTeamData(1, AwayTeamRow);
}

// Gives each skater of a team the attributes of consecutive rows of the team's players from Players.csv. Requires the DataTables to be assigned.
void ALihlGameMode::ApplyTeamData(int32 TeamIndex, FName TeamRowName)
{
	if (!TeamsTable || !PlayersTable) return;   // POC runs with default attributes when the tables are not assigned
	const FLihlTeamRow* Team = TeamsTable->FindRow<FLihlTeamRow>(TeamRowName, TEXT("ApplyTeamData"));
	if (!Team) return;
	TArray<FLihlPlayerRow*> Rows;
	PlayersTable->GetAllRows<FLihlPlayerRow>(TEXT("ApplyTeamData"), Rows);
	Rows = Rows.FilterByPredicate([&](const FLihlPlayerRow* R) { return R->PrimaryTeamId == Team->TeamId; });
	Rows.Sort([](const FLihlPlayerRow& A, const FLihlPlayerRow& B) { return A.Rating > B.Rating; });
	int32 Idx = 0;
	for (ALihlSkater* S : Skaters) if (S && S->TeamIndex == TeamIndex && Rows.IsValidIndex(Idx)) S->ApplyPlayerRow(*Rows[Idx++]);
	if (GoaliesTable)
		if (const FLihlGoalieRow* GR = GoaliesTable->FindRow<FLihlGoalieRow>(FName(*FString::Printf(TEXT("G%d"), Team->GoalieId)), TEXT("ApplyTeamData")))
			for (TActorIterator<ALihlGoalie> It(GetWorld()); It; ++It) if (It->TeamIndex == TeamIndex) It->ApplyGoalieRow(*GR);
}

void ALihlGameMode::Tick(float Dt)
{
	Super::Tick(Dt);
	if (!Puck) return;
	ClockSeconds = FMath::Max(0.f, ClockSeconds - Dt);   // TODO: stop the clock during stoppages (G.pause), periods, overtime
	if (Puck->PendingGoalSide >= 0 && !bGoalPending)
	{
		// Goal confirmed by the swept crossing test (does not wait for the overlap, so it also works if the volume were mis-sized).
		const int32 Scorer = 1 - Puck->PendingGoalSide;  // the team defending side PendingGoalSide conceded
		++Score[Scorer]; bGoalPending = true;
		OnGoal.Broadcast(Scorer, Score[Scorer]);
		FTimerHandle H; GetWorldTimerManager().SetTimer(H, this, &ALihlGameMode::StartFaceoff, 3.f, false);
	}
}

void ALihlGameMode::NotifyPuckInGoalVolume(ALihlPuck* InPuck, int32 DefendingTeam)
{
	// The overlap alone is not a goal (the puck can enter the volume above the bar or from behind); the crossing flag in Tick decides. Kept for debug logging.
	UE_LOG(LogTemp, Verbose, TEXT("Puck in goal volume of team %d, crossing flag %d"), DefendingTeam, InPuck ? InPuck->PendingGoalSide : -99);
}

void ALihlGameMode::StartFaceoff()
{
	bGoalPending = false;
	if (Puck) Puck->ResetTo(W * .5f, MY);
}
