
///////////////////////////////////////
//                                   //
//    iTrust-Database Provisioner    //
//    Timothy Dement                 //
//    MON 16 APR 2018                //
//                                   //
///////////////////////////////////////

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
            Values : [ 'iTrust-Database' ]
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
        else console.log('The iTrust-Database server has already been provisioned\n');
    }
});

function provision()
{
    console.log('Beginning EC2 provisioning...\n');

    var createKeyPairParams = { KeyName : 'iTrust-Database' };

    EC2.createKeyPair(createKeyPairParams, function(err, data)
    {
        if (err) console.log('Failed to create key pair\n\n', err, '\n');
        else
        {
            console.log('Successfully created key pair\n');

            privateKey = data.KeyMaterial;

            var createSecurityGroupParams =
            {
                Description : 'iTrust-Database',
                GroupName : 'iTrust-Database'
            };

            EC2.createSecurityGroup(createSecurityGroupParams, function(err, data)
            {
                if (err) console.log('Failed to create security group\n\n', err, '\n');
                else
                {
                    console.log('Successfully created security group\n');

                    var authorizeSecurityGroupIngressParams =
                    {
                        GroupName : 'iTrust-Database',
                        IpPermissions :
                        [
                            {
                                IpProtocol : 'tcp',
                                FromPort : 3306,
                                ToPort : 3306,
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
                                    KeyName : 'iTrust-Database',
                                    SecurityGroups : [ 'iTrust-Database' ]
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
                                                Tags : [ { Key : 'Name', Value : 'iTrust-Database' } ]
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

                                                                    fs.writeFile('/home/ubuntu/JenkinsDeploy/itrust-database.key', privateKey, function(err)
                                                                    {
                                                                        if (err) console.log('Failed to write private key file\n\n', err, '\n');
                                                                        else
                                                                        {
                                                                            console.log('Successfully wrote private key file\n');

                                                                            fs.chmod('/home/ubuntu/JenkinsDeploy/itrust-database.key', 0600, function(err)
                                                                            {
                                                                                if (err) console.log('Failed to change private key file permissions\n\n', err, '\n');
                                                                                else console.log('Successfully changed file permissions\n');
                                                                            });
                                                                        }
                                                                    });

                                                                    var inventory = `[itrust-database]\n`;
                                                                    inventory += publicIpAddress;
                                                                    inventory += ` ansible_user=ubuntu`;
                                                                    inventory += ` ansible_ssh_private_key_file=/home/ubuntu/JenkinsDeploy/itrust-database.key`;
                                                                    inventory += ` ansible_ssh_common_args='-o StrictHostKeyChecking=no'`;

                                                                    fs.writeFileSync('/home/ubuntu/JenkinsDeploy/itrust-database-inventory', inventory, function(err)
                                                                    {
                                                                        if (err) console.log('Failed to write inventory file\n\n', err, '\n');
                                                                        else console.log('Successfully wrote inventory file\n');
                                                                    });

                                                                    var iTrustDatabaseIpAddress = `\nitrust_database_ip_address: ${publicIpAddress}\n`;

                                                                    fs.open('/home/ubuntu/JenkinsDeploy/vars/main.yml', 'a', function(err)
                                                                    {
                                                                        if (err) console.log('Failed to open Ansible variable file\n\n', err, '\n');
                                                                        else console.log('Successfully opened Ansible variable file\n');

                                                                        fs.appendFile('/home/ubuntu/JenkinsDeploy/vars/main.yml', iTrustDatabaseIpAddress, function(err)
                                                                        {
                                                                            if (err) console.log('Failed to append Ansible variable file\n\n', err, '\n');
                                                                            else console.log('Successfully appended Ansible variable file\n');
                                                                        });
                                                                    });

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
