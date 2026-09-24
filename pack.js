const { packager } = require('@electron/packager');
(async () => {
  const paths = await packager({
    dir: '.', out: 'out', overwrite: true, platform: 'darwin', arch: (process.env.ARCH || 'arm64').split(','),
    name: 'First Light', executableName: 'First Light', appBundleId: 'org.hipperson.firstlight',
    appCategoryType: 'public.app-category.productivity', icon: 'build-icon.icns', appVersion: require('./package.json').version,
    ignore: [/^\/\.git/, /^\/\.github/, /^\/README/, /^\/PRIVACY/, /^\/LICENSE/, /^\/icon\.png/, /^\/docs/, /^\/src\/google-client\.example/, /^\/out/, /^\/src\.bak/, /^\/pack\.js/, /^\/build-icon/, /^\/node_modules\/(electron|@electron)\//],
    extendInfo: { LSUIElement: false, NSHumanReadableCopyright: 'Hipperson' }, prune: true, asar: true
  });
  console.log(paths);
})().catch(e => { console.error(e); process.exit(1); });
