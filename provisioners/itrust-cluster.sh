#!/bin/bash

for instance in "alpha" "bravo" "charlie" "delta" "echo"
do
    node "/home/ubuntu/JenkinsDeploy/provisioners/aws-itrust-$instance.js"
done
