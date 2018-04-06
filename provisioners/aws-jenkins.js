
///////////////////////////////
//                           //
//    Jenkins Provisioner    //
//    Timothy Dement         //
//    MON 16 APR 2018        //
//                           //
///////////////////////////////

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
            Values : [ 'Jenkins' ]
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
        else console.log('The Jenkins server has already been provisioned\n');
    }
});

function provision()
{
    console.log('Beginning EC2 provisioning...\n');

    var createKeyPairParams = { KeyName : 'Jenkins' };

    EC2.createKeyPair(createKeyPairParams, function(err, data)
    {
        if (err) console.log('Failed to create key pair\n\n', err, '\n');
        else
        {
            console.log('Successfully created key pair\n');

            privateKey = data.KeyMaterial;

            var createSecurityGroupParams =
            {
                Description : 'Jenkins',
                GroupName : 'Jenkins'
            };

            EC2.createSecurityGroup(createSecurityGroupParams, function(err, data)
            {
                if (err) console.log('Failed to create security group\n\n', err, '\n');
                else
                {
                    console.log('Successfully created security group\n');

                    var authorizeSecurityGroupIngressParams =
                    {
                        GroupName : 'Jenkins',
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
                                FromPort : 80,
                                ToPort : 80,
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
                                    InstanceType : 'm3.medium',
                                    MinCount : 1,
                                    MaxCount : 1,
                                    KeyName : 'Jenkins',
                                    SecurityGroups : [ 'Jenkins' ]
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
                                                Tags : [ { Key : 'Name', Value : 'Jenkins' } ]
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