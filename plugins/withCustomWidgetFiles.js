// plugins/withCustomWidgetFiles.js
// Expo config plugin that replaces expo-widgets generated Swift files with
// our own pure SwiftUI widget code. Must run AFTER expo-widgets in the plugins array.

const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NATIVE_WIDGET_DIR = "native/widget";
const TARGET_NAME = "ExpoWidgetsTarget";

// source file in native/widget/ -> destination file in ios/ExpoWidgetsTarget/
const FILE_MAP = {
  "ClimMateWidgetBundle.swift": "index.swift", // replaces generated @main
  "ClimMateWidgetDefinition.swift": "ClimMateWidget.swift", // replaces generated Widget
  "ClimMateWidgetEntry.swift": "ClimMateWidgetEntry.swift", // new file
  "ClimMateWidgetView.swift": "ClimMateWidgetView.swift", // new file
  // Live Activity
  "ClimbingSessionAttributes.swift": "ClimbingSessionAttributes.swift", // new file
  "ClimbingSessionLiveActivity.swift": "ClimbingSessionLiveActivity.swift", // new file
};

// Files that are NEW (not replacing existing ones) — need Xcode project registration
const NEW_FILES = [
  "ClimMateWidgetEntry.swift",
  "ClimMateWidgetView.swift",
  // Live Activity
  "ClimbingSessionAttributes.swift",
  "ClimbingSessionLiveActivity.swift",
];

function withCustomWidgetFiles(config) {
  // Step 1: Copy Swift files to ios/ExpoWidgetsTarget/
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;
      const sourceDir = path.join(projectRoot, NATIVE_WIDGET_DIR);
      const targetDir = path.join(platformRoot, TARGET_NAME);

      if (!fs.existsSync(targetDir)) {
        console.warn(
          `[withCustomWidgetFiles] Target directory not found: ${targetDir}`
        );
        return config;
      }

      for (const [srcFile, destFile] of Object.entries(FILE_MAP)) {
        const srcPath = path.join(sourceDir, srcFile);
        const destPath = path.join(targetDir, destFile);

        if (!fs.existsSync(srcPath)) {
          throw new Error(
            `[withCustomWidgetFiles] Missing source file: ${srcPath}`
          );
        }
        fs.copyFileSync(srcPath, destPath);
      }

      return config;
    },
  ]);

  // Step 2: Register new Swift files in Xcode project (directly target ExpoWidgetsTarget)
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const objects = xcodeProject.hash.project.objects;

    // Find ExpoWidgetsTarget and its Sources build phase
    const nativeTargets = objects["PBXNativeTarget"];
    let targetUuid = null;
    let sourcesBuildPhaseUuid = null;

    for (const [uuid, target] of Object.entries(nativeTargets)) {
      if (typeof target === "object" && target.name === TARGET_NAME) {
        targetUuid = uuid;
        // Find Sources build phase from this target's buildPhases
        for (const phase of target.buildPhases || []) {
          if (objects["PBXSourcesBuildPhase"][phase.value]) {
            sourcesBuildPhaseUuid = phase.value;
            break;
          }
        }
        break;
      }
    }

    if (!targetUuid || !sourcesBuildPhaseUuid) {
      console.warn(
        "[withCustomWidgetFiles] Could not find ExpoWidgetsTarget or its Sources build phase"
      );
      return config;
    }

    // Find the PBXGroup for ExpoWidgetsTarget
    const groups = objects["PBXGroup"];
    let groupKey = null;
    for (const [key, group] of Object.entries(groups)) {
      if (typeof group === "object" && group.name === TARGET_NAME) {
        groupKey = key;
        break;
      }
    }

    const sourcesBuildPhase = objects["PBXSourcesBuildPhase"][sourcesBuildPhaseUuid];

    for (const fileName of NEW_FILES) {
      // Check if file is already registered in the correct target's Sources phase
      const fileRefs = objects["PBXFileReference"];
      const alreadyInTarget = Object.entries(fileRefs).some(
        ([, ref]) =>
          typeof ref === "object" &&
          (ref.name === fileName || ref.path === fileName)
      ) && sourcesBuildPhase.files.some(
        (f) => (f.comment || "").includes(fileName)
      );

      if (alreadyInTarget) {
        continue;
      }

      // Generate unique UUIDs
      const fileRefUuid = xcodeProject.generateUuid();
      const buildFileUuid = xcodeProject.generateUuid();

      // Add PBXFileReference
      objects["PBXFileReference"][fileRefUuid] = {
        isa: "PBXFileReference",
        lastKnownFileType: "sourcecode.swift",
        path: fileName,
        sourceTree: '"<group>"',
      };
      objects["PBXFileReference"][`${fileRefUuid}_comment`] = fileName;

      // Add PBXBuildFile (linked to ExpoWidgetsTarget, not main app)
      objects["PBXBuildFile"][buildFileUuid] = {
        isa: "PBXBuildFile",
        fileRef: fileRefUuid,
        fileRef_comment: fileName,
      };
      objects["PBXBuildFile"][`${buildFileUuid}_comment`] = `${fileName} in Sources`;

      // Add to ExpoWidgetsTarget PBXGroup
      if (groupKey) {
        const group = groups[groupKey];
        if (group && group.children) {
          group.children.push({ value: fileRefUuid, comment: fileName });
        }
      }

      // Add to ExpoWidgetsTarget's Sources build phase (NOT main app's)
      sourcesBuildPhase.files.push({
        value: buildFileUuid,
        comment: `${fileName} in Sources`,
      });

      console.log(`[withCustomWidgetFiles] Registered ${fileName} in ${TARGET_NAME}`);
    }

    return config;
  });

  return config;
}

module.exports = withCustomWidgetFiles;
