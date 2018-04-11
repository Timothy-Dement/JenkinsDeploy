
////////////////////////////////////
//                                //
//    iTrust-Alpha Provisioner    //
//    Timothy Dement              //
//    MON 16 APR 2018             //
//                                //
////////////////////////////////////

var AWS = require('aws-sdk');
var fs = require('fs');

AWS.config.update( { region : 'us-east-1' } );

var EC2 = new AWS.EC2();

var allocationId;
var instanceId;
var privateKey;
var publicIpAddress;

var describeInstancesParams =
{
    Filters :
    [
        {
            Name : 'tag:Name',
            Values : [ 'iTrust-Alpha' ]
        }
    ]
};

EC2.describeInstances(describeInstancesParams, function(err, data)
{
    if (err) console.log('\nFailed to describe instance\n\n', err, '\n');
    else
    {
        console.log('\nSuccessfully described instance\n');

        if (data.Reservations.length === 0) provision();
        else console.log('The iTrust-Alpha server has already been provisioned\n');
    }
});

function provision()
{
    console.log('Beginning EC2 provisioning...\n');

    var createKeyPairParams = { KeyName : 'iTrust-Alpha' };

    EC2.createKeyPair(createKeyPairParams, function(err, data)
    {
        if (err) console.log('Failed to create key pair\n\n', err, '\n');
        else
        {
            console.log('Successfully created key pair\n');

            privateKey = data.KeyMaterial;

            var createSecurityGroupParams =
            {
                Description : 'iTrust-Alpha',
                GroupName : 'iTrust-Alpha'
            };

            EC2.createSecurityGroup(createSecurityGroupParams, function(err, data)
            {
                if (err) console.log('Failed to create security group\n\n', err, '\n');
                else
                {
                    console.log('Successfully created security group\n');

                    var authorizeSecurityGroupIngressParams =
                    {
                        GroupName : 'iTrust-Alpha',
                        IpPermissions :
                        [
                            {
                                IpProtocol : 'tcp',
                                FromPort : 22,
                                ToPort : 22,
                                IpRanges : [ { 'CidrIp' : '0.0.0.0/0' } ]
                            },
                            {
                                IpProtocol : 'tcp',
                                FromPort : 8080,
                                ToPort : 8080,
                                IpRanges : [ { 'CidrIp' : '0.0.0.0/0' } ]
                            }
                        ]
                    };

                    console.log('Pausing for 5 seconds...\n');

                    setTimeout(function()
                    {
                        EC2.authorizeSecurityGroupIngress(authorizeSecurityGroupIngressParams, function(err, data)
                        {
                            if (err) console.log('Failed to authorize security group ingress\n\n', err, '\n');
                            else
                            {
                                console.log('Successfully authorized security group ingress\n');

                                var runInstanceParams =
                                {
                                    ImageId : 'ami-dc2d10a6',
                                    InstanceType : 'm3.large',
                                    MinCount : 1,
                                    MaxCount : 1,
                                    KeyName : 'iTrust-Alpha',
                                    SecurityGroups : [ 'iTrust-Alpha' ]
                                };

                                EC2.runInstances(runInstanceParams, function(err, data)
                                {
                                    if (err) console.log('Failed to run instance\n\n', err, '\n');
                                    else
                                    {
                                        console.log('Successfully ran instance\n');

                                        instanceId = data.Instances[0].InstanceId;

                                        console.log('Pausing for 1 minute...\n');

                                        setTimeout(function()
                                        {
                                            var createTagsParams =
                                            {
                                                Resources : [ instanceId ],
                                                Tags : [ { Key : 'Name', Value : 'iTrust-Alpha' } ]
                                            };

                                            EC2.createTags(createTagsParams, function(err, data)
                                            {
                                                if (err) console.log('Failed to create tag\n\n', err, '\n');
                                                else
                                                {
                                                    console.log('Successfully created tag\n');

                                                    var allocateAddressParams = { };

                                                    EC2.allocateAddress(allocateAddressParams, function(err, data)
                                                    {
                                                        if (err) console.log('Failed to allocate address\n\n', err, '\n');
                                                        else
                                                        {
                                                            console.log('Successfully allocated address\n');

                                                            allocationId = data.AllocationId;
                                                            publicIpAddress = data.PublicIp;
                                                            
                                                            var associateAddressParams =
                                                            {
                                                                InstanceId : instanceId,
                                                                AllocationId : allocationId
                                                            };

                                                            EC2.associateAddress(associateAddressParams, function(err, data)
                                                            {
                                                                if (err) console.log('Failed to associate address\n\n', err, '\n');
                                                                else
                                                                {
                                                                    console.log('Successfully associated address\n');

                                                                    fs.writeFile('/home/ubuntu/JenkinsDeploy/itrust-alpha.key', privateKey, function(err)
                                                                    {
                                                                        if (err) console.log('Failed to write private key file\n\n', err, '\n');
                                                                        else
                                                                        {
                                                                            console.log('Successfully wrote private key file\n');

                                                                            fs.chmod('/home/ubuntu/JenkinsDeploy/itrust-alpha.key', 0600, function(err)
                                                                            {
                                                                                if (err) console.log('Failed to change private key file permissions\n\n', err, '\n');
                                                                                else console.log('Successfully changed file permissions\n');
                                                                            });
                                                                        }
                                                                    });

                                                                    if (fs.existsSync('/home/ubuntu/JenkinsDeploy/itrust-cluster-inventory'))
                                                                    {
                                                                        fs.open('/home/ubuntu/JenkinsDeploy/itrust-cluster-inventory', 'a', function(err)
                                                                        {
                                                                            if (err) console.log('Failed to open itrust-cluster-inventory file\n\n', err, '\n');
                                                                            else console.log('Successfully opened itrust-cluster-inventory file\n');
                                                                    
                                                                            var inventoryItem = publicIpAddress;
                                                                            inventoryItem += ` ansible_user=ubuntu`;
                                                                            inventoryItem += ` ansible_ssh_private_key_file=/home/ubuntu/JenkinsDeploy/itrust-alpha.key`;
                                                                            inventoryItem += ` ansible_python_interpreter=/usr/bin/python3`;
                                                                            inventoryItem += ` ansible_ssh_common_args='-o StrictHostKeyChecking=no'\n`;
                                                                    
                                                                            fs.appendFile('/home/ubuntu/JenkinsDeploy/itrust-cluster-inventory', inventoryItem, function(err)
                                                                            {
                                                                                if (err) console.log('Failed to append itrust-cluster-inventory file\n\n', err, '\n');
                                                                                else console.log('Successfully appended itrust-cluster-inventory file\n');
                                                                            });
                                                                        });
                                                                    }
                                                                    else
                                                                    {
                                                                        var inventory = '[itrust-cluster]\n';
                                                                        inventory += publicIpAddress;
                                                                        inventory += ` ansible_user=ubuntu`;
                                                                        inventory += ` ansible_ssh_private_key_file=/home/ubuntu/JenkinsDeploy/itrust-alpha.key`;
                                                                        inventory += ` ansible_python_interpreter=/usr/bin/python3`;
                                                                        inventory += ` ansible_ssh_common_args='-o StrictHostKeyChecking=no'`;
                                                                    
                                                                        fs.writeFileSync('/home/ubuntu/JenkinsDeploy/itrust-cluster-inventory', inventory, function(err)
                                                                        {
                                                                            if (err) console.log('Failed to write inventory file\n\n', err, '\n');
                                                                            else console.log('Successfully wrote inventory file\n');
                                                                        });
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }, 60000);
                                    }
                                });
                            }
                        });
                    }, 5000);
                }
            });
        }
    });
}
