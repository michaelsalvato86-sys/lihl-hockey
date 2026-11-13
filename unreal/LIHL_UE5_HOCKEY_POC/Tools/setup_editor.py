"""Editor-side setup for LIHL_UE5_HOCKEY_POC. NOT RUN: Unreal Engine is not installed on the authoring PC. Every `unreal.*` name below is from memory of the
UE 5.x Python API; mark anything that errors as TODO(verify in editor) and fix against the Python API docs of your engine version.

How to run (after the C++ module compiled and the editor is open): Tools > Execute Python Script... > choose this file,
or in the Output Log:  py "<absolute path>/Tools/setup_editor.py"
What it does:
  1. Imports Content/Data/{Teams,Players,Goalies,Jerseys,AnimEvents}.csv as DataTable assets in /Game/Data using the FLihlXxxRow structs.
  2. Creates an empty map /Game/Maps/L_RinkPOC if missing (set it as default map: DefaultEngine.ini already points there).
Blueprint-free: no Blueprint assets are created. Enhanced Input assets (IA_Move, IA_Shoot, IA_Pass, IMC_Skater) must be created by hand, see README step 6.
"""
import os
import unreal

PROJECT_DIR = unreal.Paths.project_dir()
DATA_DIR = os.path.join(PROJECT_DIR, "Content", "Data")
TABLES = {
    "Teams": "LihlTeamRow",
    "Players": "LihlPlayerRow",
    "Goalies": "LihlGoalieRow",
    "Jerseys": "LihlJerseyRow",
    "AnimEvents": "LihlAnimEventRow",
}


def import_table(name, struct_name):
    csv_path = os.path.join(DATA_DIR, name + ".csv")
    factory = unreal.CSVImportFactory()
    settings = unreal.CSVImportSettings()
    # TODO(verify in editor): the struct is found by path /Script/<Module>.<Struct>
    settings.import_row_struct = unreal.load_object(None, "/Script/LIHL_UE5_HOCKEY_POC." + struct_name)
    factory.automated_import_settings = settings
    task = unreal.AssetImportTask()
    task.filename = csv_path
    task.destination_path = "/Game/Data"
    task.destination_name = "DT_" + name
    task.factory = factory
    task.automated = True
    task.save = True
    task.replace_existing = True
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    unreal.log("imported %s -> /Game/Data/DT_%s" % (csv_path, name))


def ensure_map():
    path = "/Game/Maps/L_RinkPOC"
    if not unreal.EditorAssetLibrary.does_asset_exist(path):
        unreal.EditorLoadingAndSavingUtils.new_blank_map(False)  # TODO(verify in editor)
        unreal.EditorLoadingAndSavingUtils.save_current_level_as(path) if hasattr(unreal.EditorLoadingAndSavingUtils, "save_current_level_as") else None
        unreal.log("created map %s (if the save helper is missing, save the blank map manually as %s)" % (path, path))


for tbl, st in TABLES.items():
    import_table(tbl, st)
ensure_map()
unreal.log("LIHL setup done. Next: assign DT_Teams/DT_Players/DT_Goalies/DT_Jerseys to the GameMode (World Settings > GameMode Override > LihlGameMode defaults).")
