#!/bin/bash

for instance in alpha bravo
do
    node "/home/ubuntu/JenkinsDeploy/provisioners/aws-itrust-$instance.js"
done
