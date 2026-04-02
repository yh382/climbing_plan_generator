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

    // --- Deduplicate ExpoWidgetsTarget native targets ---
    // expo-widgets + xcode npm module can create duplicate PBXNativeTarget entries.
    // Keep only the first one; remove extras and their associated objects.
    deduplicateWidgetTarget(objects, TARGET_NAME);

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
      if (typeof group === "object" && group.name === TARGET_NAME && group.path === TARGET_NAME) {
        groupKey = key;
        break;
      }
    }

    const sourcesBuildPhase = objects["PBXSourcesBuildPhase"][sourcesBuildPhaseUuid];

    // Fix expo-widgets generated PBXFileReference entries
    // The xcode npm module serializes undefined JS values as literal "undefined"
    // strings, and uses absolute paths with sourceTree="<group>" which is invalid.
    // This causes the xcodeproj Ruby gem to fail during pod install post_install.
    const fileRefs = objects["PBXFileReference"];
    for (const [uuid, ref] of Object.entries(fileRefs)) {
      if (typeof ref !== "object") continue;
      const name = ref.name ? ref.name.replace(/"/g, "") : "";
      const refPath = ref.path ? ref.path.replace(/"/g, "") : "";
      if (!refPath.includes(TARGET_NAME)) continue;

      // Remove invalid explicitFileType (xcode npm module serializes JS
      // undefined as literal string "undefined" in pbxproj)
      if ("explicitFileType" in ref) {
        const val = ref.explicitFileType;
        if (val === undefined || val === null || String(val).replace(/"/g, "") === "undefined") {
          delete ref.explicitFileType;
        }
      }
      // Fix absolute paths to relative (basename only)
      if (refPath.startsWith("/")) {
        ref.path = path.basename(refPath);
        ref.name = ref.path;
      }
    }

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

/**
 * Remove duplicate ExpoWidgetsTarget entries from the Xcode project.
 * expo-widgets + xcode npm module can produce two PBXNativeTarget entries
 * with separate product files, build config lists, groups, etc.
 * We keep the first target and purge the rest.
 */
function deduplicateWidgetTarget(objects, targetName) {
  const nativeTargets = objects["PBXNativeTarget"];
  const matchingUuids = [];

  for (const [uuid, target] of Object.entries(nativeTargets)) {
    if (typeof target === "object" && target.name === targetName) {
      matchingUuids.push(uuid);
    }
  }

  if (matchingUuids.length <= 1) return;

  const keepUuid = matchingUuids[0];
  const removeUuids = matchingUuids.slice(1);

  for (const uuid of removeUuids) {
    const target = nativeTargets[uuid];

    // Remove product file reference
    if (target.productReference) {
      const prodRef = typeof target.productReference === "object"
        ? target.productReference.value
        : target.productReference;
      if (prodRef) {
        delete objects["PBXFileReference"][prodRef];
        delete objects["PBXFileReference"][`${prodRef}_comment`];
        // Remove from Products PBXGroup
        for (const [, group] of Object.entries(objects["PBXGroup"])) {
          if (typeof group === "object" && group.name === "Products" && group.children) {
            group.children = group.children.filter(
              (c) => c.value !== prodRef
            );
          }
        }
        // Remove associated PBXBuildFile entries
        for (const [bfKey, bf] of Object.entries(objects["PBXBuildFile"])) {
          if (typeof bf === "object" && bf.fileRef === prodRef) {
            delete objects["PBXBuildFile"][bfKey];
            delete objects["PBXBuildFile"][`${bfKey}_comment`];
            // Remove from Embed Foundation Extensions CopyFiles phases
            removeBuildFileFromPhases(objects, "PBXCopyFilesBuildPhase", bfKey);
          }
        }
      }
    }

    // Remove build config list
    if (target.buildConfigurationList) {
      const listId = typeof target.buildConfigurationList === "object"
        ? target.buildConfigurationList.value
        : target.buildConfigurationList;
      const configList = objects["XCConfigurationList"]?.[listId];
      if (configList && configList.buildConfigurations) {
        for (const bc of configList.buildConfigurations) {
          const bcId = typeof bc === "object" ? bc.value : bc;
          delete objects["XCBuildConfiguration"]?.[bcId];
          delete objects["XCBuildConfiguration"]?.[`${bcId}_comment`];
        }
      }
      delete objects["XCConfigurationList"]?.[listId];
      delete objects["XCConfigurationList"]?.[`${listId}_comment`];
    }

    // Remove duplicate build phases
    if (target.buildPhases) {
      for (const bp of target.buildPhases) {
        const bpId = typeof bp === "object" ? bp.value : bp;
        // Check each build phase type
        for (const phaseType of ["PBXSourcesBuildPhase", "PBXFrameworksBuildPhase", "PBXCopyFilesBuildPhase", "PBXShellScriptBuildPhase", "PBXResourcesBuildPhase"]) {
          if (objects[phaseType]?.[bpId]) {
            delete objects[phaseType][bpId];
            delete objects[phaseType]?.[`${bpId}_comment`];
          }
        }
      }
    }

    // Remove from PBXProject targets array
    const pbxProject = objects["PBXProject"];
    for (const [, proj] of Object.entries(pbxProject)) {
      if (typeof proj === "object" && proj.targets) {
        proj.targets = proj.targets.filter((t) => {
          const tid = typeof t === "object" ? t.value : t;
          return tid !== uuid;
        });
      }
      // Remove from TargetAttributes
      if (proj?.attributes?.TargetAttributes?.[uuid]) {
        delete proj.attributes.TargetAttributes[uuid];
      }
    }

    // Remove duplicate target dependencies
    const deps = objects["PBXTargetDependency"];
    if (deps) {
      for (const [depKey, dep] of Object.entries(deps)) {
        if (typeof dep === "object" && dep.target === uuid) {
          // Remove associated PBXContainerItemProxy
          if (dep.targetProxy) {
            delete objects["PBXContainerItemProxy"]?.[dep.targetProxy];
            delete objects["PBXContainerItemProxy"]?.[`${dep.targetProxy}_comment`];
          }
          delete deps[depKey];
          delete deps[`${depKey}_comment`];
          // Remove from main target's dependencies
          const mainTarget = nativeTargets[Object.keys(nativeTargets).find(
            (k) => typeof nativeTargets[k] === "object" && nativeTargets[k].name !== targetName
          )];
          if (mainTarget?.dependencies) {
            mainTarget.dependencies = mainTarget.dependencies.filter(
              (d) => (typeof d === "object" ? d.value : d) !== depKey
            );
          }
        }
      }
    }

    // Remove duplicate PBXGroup for the target
    const groups = objects["PBXGroup"];
    const keepGroupKey = Object.keys(groups).find(
      (k) => typeof groups[k] === "object" && groups[k].name === targetName && groups[k].path === targetName
    );
    // Find and remove other groups with same name+path, keeping the first
    const seenGroupKeys = new Set();
    for (const [gKey, g] of Object.entries(groups)) {
      if (typeof g !== "object") continue;
      if (g.name === targetName && g.path === targetName) {
        if (seenGroupKeys.size > 0) {
          // Remove this duplicate group from root group's children
          for (const [, rootGroup] of Object.entries(groups)) {
            if (typeof rootGroup === "object" && rootGroup.children) {
              rootGroup.children = rootGroup.children.filter(
                (c) => c.value !== gKey
              );
            }
          }
          delete groups[gKey];
          delete groups[`${gKey}_comment`];
        }
        seenGroupKeys.add(gKey);
      }
    }

    // Remove native target entry
    delete nativeTargets[uuid];
    delete nativeTargets[`${uuid}_comment`];

    console.log(`[withCustomWidgetFiles] Removed duplicate ${targetName} target: ${uuid}`);
  }

  // Clean up duplicate product file entries in Embed Foundation Extensions
  // (the kept target's product may appear twice in the CopyFiles phase)
  const copyPhases = objects["PBXCopyFilesBuildPhase"];
  if (copyPhases) {
    for (const [, phase] of Object.entries(copyPhases)) {
      if (typeof phase === "object" && phase.files) {
        const seen = new Set();
        phase.files = phase.files.filter((f) => {
          const key = typeof f === "object" ? f.value : f;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }
  }
}

function removeBuildFileFromPhases(objects, phaseType, buildFileUuid) {
  const phases = objects[phaseType];
  if (!phases) return;
  for (const [, phase] of Object.entries(phases)) {
    if (typeof phase === "object" && phase.files) {
      phase.files = phase.files.filter(
        (f) => (typeof f === "object" ? f.value : f) !== buildFileUuid
      );
    }
  }
}

module.exports = withCustomWidgetFiles;
