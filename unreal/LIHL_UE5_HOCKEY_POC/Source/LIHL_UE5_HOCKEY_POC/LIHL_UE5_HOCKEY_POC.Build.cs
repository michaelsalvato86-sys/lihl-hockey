// NOT COMPILED. Modules: Core, CoreUObject, Engine, InputCore, EnhancedInput (as requested); UMG + Slate for the scoreboard widget class.
// GameplayAbilities is NOT needed. The "Data" folder holds the generated row structs (tools/export_unreal_data.py).
using UnrealBuildTool;

public class LIHL_UE5_HOCKEY_POC : ModuleRules
{
	public LIHL_UE5_HOCKEY_POC(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore", "EnhancedInput", "UMG", "Slate", "SlateCore" });
		PublicIncludePaths.Add(ModuleDirectory);
	}
}
