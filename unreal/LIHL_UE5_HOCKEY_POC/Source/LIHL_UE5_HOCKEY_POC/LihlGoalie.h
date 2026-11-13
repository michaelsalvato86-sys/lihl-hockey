// LihlGoalie.h  NOT COMPILED, NOT RUN.
// Goalie actor: arc positioning (goalieStep, game.html lines 736-756) and save selection by puck height (goalieHV line 735, save kind line 697),
// implemented in LihlSimMath.h (GoalieTargetY, GoalieMove, SelectSave, SaveProbability). The actor only feeds the world state and applies the result.
// Animation: the save kind and event id ("save", payload kind,side,dy,h,rc,z) match docs/UE5_EVENT_SCHEMA.md so an AnimInstance can consume the
// same event ids as the web game (OnSaveEvent delegate).
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LihlSimMath.h"
#include "Data/LihlDataRows.h"
#include "LihlGoalie.generated.h"

class ALihlPuck;
class UCapsuleComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FLihlSaveEvent, FName, EventId, uint8, SaveKind, float, PuckHeightFt);

UCLASS()
class LIHL_UE5_HOCKEY_POC_API ALihlGoalie : public AActor
{
	GENERATED_BODY()
public:
	ALihlGoalie();
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LIHL") TObjectPtr<UCapsuleComponent> Body;
	UPROPERTY(EditAnywhere, Category = "LIHL") int32 TeamIndex = 0;  // 0 defends the left goal (x = GX), 1 the right (x = W-GX)
	UPROPERTY(EditAnywhere, Category = "LIHL") float DifficultyGk = 1.f; // DIFFK[difficulty].gk (line 611)
	UPROPERTY(EditAnywhere, Category = "LIHL") float DifficultySave = 0.f; // DIFFK[difficulty].save
	UPROPERTY(BlueprintAssignable, Category = "LIHL") FLihlSaveEvent OnSaveEvent;

	void ApplyGoalieRow(const FLihlGoalieRow& Row) { State.Gl = Row.SimGl; }
	Lihl::FGoalieState State;

protected:
	Lihl::FGoalieWorld BuildWorld(const ALihlPuck* Puck) const;
	/** Save attempt when the puck crosses the goal line inside the posts (game.html lines 690-700). The block rebound physics (lines 698-706) is NOT ported. */
	void TryGoalLineSave(ALihlPuck* Puck);
	ALihlPuck* FindPuck() const;
};
