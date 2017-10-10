# analysis_client
Client for distributed nonmem analysis

## Set Virtual Box time offset
```
VBoxManage setextradata $VM "VBoxInternal/Devices/VMMDev/0/Config/GetHostTimeDisabled" 1
VBoxManage modifyvm $VM --biossystemtimeoffset <msec>
```
