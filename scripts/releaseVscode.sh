cd packages/vscode-pontx
echo 'deleting node_modules...'
rm -rf node_modules
cd ../
cp -r vscode-pontx vscode-pontx-cp
cd vscode-pontx-cp
echo 'installing node_modules...'
npm cache clean --force
npm i --registry https://registry.npm.taobao.org
echo 'relese vscode'
vsce publish
cd ..
rm -rf vscode-pontx-cp
cd ..
npm run inst
