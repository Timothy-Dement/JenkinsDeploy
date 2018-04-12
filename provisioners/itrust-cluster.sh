#!/bin/bash

for instance in "alpha" "bravo" "charlie" "delta" "echo"
do
    sudo node "/home/ubuntu/JenkinsDeploy/provisioners/aws-itrust-$instance.js"
done
