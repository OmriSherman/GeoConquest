const { withAndroidManifest } = require("@expo/config-plugins");

const withAdIdPermission = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure uses-permission array exists
    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    const permission = "com.google.android.gms.permission.AD_ID";
    const alreadyExists = manifest["uses-permission"].some(
      (perm) => perm.$?.["android:name"] === permission
    );

    if (!alreadyExists) {
      manifest["uses-permission"].push({
        $: { "android:name": permission },
      });
    }

    return config;
  });
};

module.exports = withAdIdPermission;
