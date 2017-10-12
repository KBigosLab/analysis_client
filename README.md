# analysis_client
Client for distributed nonmem analysis

## Set Virtual Box time offset
```
VBoxManage setextradata $VM "VBoxInternal/Devices/VMMDev/0/Config/GetHostTimeDisabled" 1
VBoxManage modifyvm $VM --biossystemtimeoffset <msec>
```

## Set up virtual machine
```
VM=Virtual Machine Name
vboxmanage createvm --name $VM --ostype "WindowsXP" --register
vboxmanage storagectl $VM --name "IDE" --add ide --controller PIIX4
vboxmanage storageattach $VM --storagectl "IDE" --port 0 --device 0 --type hdd --medium /path/to/vm/directory
vboxmanage modifyvm $VM --memory 3000 --vram 64
vboxmanage sharedfolder add $VM --name "Shared" --hostpath /home/ubuntu/Shared --automount
vboxmanage startvm $VM --type headless
vboxmanage list runningvms
vboxmanage controlvm $VM screenshotpng screen.png
vboxmanage controlvm $VM poweroff
```

## Unregister vm and change vm uuid
```
vboxmanage unregistervm $VM
vboxmanage internalcommands sethduuid disk-name.vdi 
```
