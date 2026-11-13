// LihlGameMode.h  NOT COMPILED, NOT RUN.
// Minimal game flow: spawns rink, puck, two goalies and 2 x N skaters, holds score and clock, handles goals and faceoffs.
// Ported pieces: clock/score shape from game.html newGame() (line 341: period, plen, clock, score), goal() (line 556), setupFaceoff (line 401).
// NOT ported: penalties, line changes, AI, overtime, replay, announcer, stats. Data: DataTable assets are created from Content/Data/*.csv (README).
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "LihlGameMode.generated.h"

class ALihlRink;
class ALihlPuck;
class ALihlSkater;
class ALihlGoalie;
class ALihlBroadcastCamera;
class UDataTable;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FLihlGoalEvent, int32, ScoringTeam, int32, NewScore);

UCLASS()
class LIHL_UE5_HOCKEY_POC_API ALihlGameMode : public AGameModeBase
{
	GENERATED_BODY()
public:
	ALihlGameMode();
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(EditAnywhere, Category = "LIHL|Data") TObjectPtr<UDataTable> TeamsTable;     // FLihlTeamRow
	UPROPERTY(EditAnywhere, Category = "LIHL|Data") TObjectPtr<UDataTable> PlayersTable;   // FLihlPlayerRow
	UPROPERTY(EditAnywhere, Category = "LIHL|Data") TObjectPtr<UDataTable> GoaliesTable;   // FLihlGoalieRow
	UPROPERTY(EditAnywhere, Category = "LIHL|Data") TObjectPtr<UDataTable> JerseysTable;   // FLihlJerseyRow
	UPROPERTY(EditAnywhere, Category = "LIHL|Match") FName HomeTeamRow = TEXT("T158");     // Queens Finest
	UPROPERTY(EditAnywhere, Category = "LIHL|Match") FName AwayTeamRow = TEXT("T159");     // Brew Crew
	UPROPERTY(EditAnywhere, Category = "LIHL|Match") int32 SkatersPerSide = 5;
	UPROPERTY(EditAnywhere, Category = "LIHL|Match") float PeriodSeconds = 300.f;          // 'ml' menu value (game.html line 341), 5 minute default
	UPROPERTY(EditAnywhere, Category = "LIHL|Match") TSubclassOf<ALihlSkater> SkaterClass;
	UPROPERTY(EditAnywhere, Category = "LIHL|Match") TSubclassOf<ALihlGoalie> GoalieClass;

	UPROPERTY(BlueprintReadOnly, Category = "LIHL") TArray<int32> Score; // 2 entries, index = team (game.html G.score)
	UPROPERTY(BlueprintReadOnly, Category = "LIHL") int32 Period = 1;
	UPROPERTY(BlueprintReadOnly, Category = "LIHL") float ClockSeconds = 300.f;
	UPROPERTY(BlueprintAssignable, Category = "LIHL") FLihlGoalEvent OnGoal;

	UPROPERTY() TArray<TObjectPtr<ALihlSkater>> Skaters;
	UPROPERTY() TObjectPtr<ALihlPuck> Puck;
	UPROPERTY() TObjectPtr<ALihlRink> Rink;

	/** From the rink goal volume overlap. Counts only if the puck flagged PendingGoalSide for that goal (crossed under the bar). */
	void NotifyPuckInGoalVolume(ALihlPuck* InPuck, int32 DefendingTeam);
	void StartFaceoff();

protected:
	void SpawnWorld();
	void ApplyTeamData(int32 TeamIndex, FName TeamRowName);
	bool bGoalPending = false;
};
