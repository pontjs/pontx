npm run sync:package
sleep 10
cd packages/vscode-pontx
echo 'deleting node_modules...'
rm -rf node_modules
cd ../../
cp -r packages/vscode-pontx vscode-pontx-cp
cd vscode-pontx-cp
echo 'installing node_modules...'
npm i --registry https://registry.npm.taobao.org
echo 'relese vscode'
vsce publish
cd ../..
lerna bootstrap