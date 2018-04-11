#!/bin/bash

for instance in alpha bravo
do
    node "/home/ubuntu/JenkinsDeploy/aws-itrust-$instance.js"
done
