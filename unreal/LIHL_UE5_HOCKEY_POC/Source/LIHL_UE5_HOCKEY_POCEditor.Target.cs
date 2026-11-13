// NOT COMPILED. Editor target. TODO(verify on compile): see the game target.
using UnrealBuildTool;
using System.Collections.Generic;

public class LIHL_UE5_HOCKEY_POCEditorTarget : TargetRules
{
	public LIHL_UE5_HOCKEY_POCEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.V5;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("LIHL_UE5_HOCKEY_POC");
	}
}
