// NOT COMPILED (Unreal Engine is not installed on the authoring PC). TODO(verify on compile): BuildSettingsVersion / IncludeOrderVersion for your engine version.
using UnrealBuildTool;
using System.Collections.Generic;

public class LIHL_UE5_HOCKEY_POCTarget : TargetRules
{
	public LIHL_UE5_HOCKEY_POCTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.V5;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("LIHL_UE5_HOCKEY_POC");
	}
}
