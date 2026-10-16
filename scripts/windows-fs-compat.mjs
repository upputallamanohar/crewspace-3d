// Some restricted Windows environments reject the native realpath syscall even
// though the ordinary Node implementation can resolve an accessible file.
// Retain native resolution normally; fall back only for that specific failure.
import fs from "node:fs";

if (process.platform === "win32") {
  const nativeSync = fs.realpathSync.native;
  fs.realpathSync.native = function realpathNativeWithFallback(file, options) {
    try {
      return nativeSync(file, options);
    } catch (error) {
      if (error?.code !== "EPERM") throw error;
      return fs.realpathSync(file, options);
    }
  };

  const nativeAsync = fs.realpath.native;
  fs.realpath.native = function realpathNativeWithFallback(file, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = undefined;
    }
    return nativeAsync(file, options, (error, resolved) => {
      if (error?.code === "EPERM") return fs.realpath(file, options, callback);
      callback(error, resolved);
    });
  };
}
