cd packages/vscode-pontx
echo 'deleting node_modules...'
rm -rf node_modules
cd ../
cp -r vscode-pontx vscode-pontx-cp
cd vscode-pontx-cp
echo 'installing node_modules...'
npm cache clean --force
npm i --registry https://registry.npmmirror.com
echo 'release vscode'
vsce package
# cd ..
# rm -rf vscode-pontx-cp
# cd ..
# npm run inst
