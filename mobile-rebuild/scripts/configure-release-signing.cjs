'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(__dirname, '../android/app/build.gradle');
const propertiesTarget = path.resolve(__dirname, '../android/gradle.properties');
if (!fs.existsSync(target)) throw new Error('Execute expo prebuild antes de configurar a assinatura.');
let source = fs.readFileSync(target, 'utf8');
if (fs.existsSync(propertiesTarget)) {
  const properties=fs.readFileSync(propertiesTarget,'utf8')
    .replace(/^org\.gradle\.jvmargs=.*$/m,'org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8')
    .replace(/^reactNativeArchitectures=.*$/m,'reactNativeArchitectures=armeabi-v7a,arm64-v8a');
  fs.writeFileSync(propertiesTarget,properties);
}
if (source.includes('RB_MOBILE_STORE_FILE')) {
  console.log('Assinatura Android já configurada.');
  process.exit(0);
}
const debugBlock = /signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\n\s*\}\s*\}/m;
const found = source.match(debugBlock);
if (!found) throw new Error('Bloco signingConfigs do Expo não foi encontrado.');
const debugBody = found[0].replace(/^signingConfigs\s*\{\s*/,'').replace(/\s*\}\s*$/,'');
const replacement = `signingConfigs {
        ${debugBody.trim()}
        release {
            if (project.hasProperty('RB_MOBILE_STORE_FILE')) {
                storeFile file(project.property('RB_MOBILE_STORE_FILE'))
                storePassword project.property('RB_MOBILE_STORE_PASSWORD')
                keyAlias project.property('RB_MOBILE_KEY_ALIAS')
                keyPassword project.property('RB_MOBILE_KEY_PASSWORD')
            }
        }
    }`;
source = source.replace(found[0], replacement);
source = source.replace(
  /release\s*\{\s*\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/m,
  match => match.replace('signingConfig signingConfigs.debug', `if (!project.hasProperty('RB_MOBILE_STORE_FILE') && System.getenv('CI') == 'true') {
                throw new GradleException('Assinatura Mobile ausente: configure os quatro secrets RB_MOBILE_* no GitHub.')
            }
            signingConfig project.hasProperty('RB_MOBILE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`)
);
if (!source.includes("project.hasProperty('RB_MOBILE_STORE_FILE') ? signingConfigs.release")) throw new Error('Configuração release do Expo não foi encontrada.');
fs.writeFileSync(target, source);
console.log('Assinatura Android de produção configurada.');
