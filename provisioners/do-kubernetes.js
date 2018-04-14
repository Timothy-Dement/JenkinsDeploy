
//////////////////////////////////
//                              //
//    Kubernetes Provisioner    //
//    Timothy Dement            //
//    MON APR 16 2018           //
//                              //
//////////////////////////////////

var fs = require('fs');
var shell = require('shelljs');
var request = require('request');

var token = process.env.DIGITAL_OCEAN_TOKEN;

var url = 'https://api.digitalocean.com/v2/';

var headers =
{
    'Authorization' : 'Bearer ' + token,
    'Content-Type' : 'application/json'
};

shell.exec(`ssh-keygen -t rsa -f "${__dirname}/do-key" -q -N ""`);

fs.readFile(`${__dirname}/do-key.pub`, 'utf8', function(err, publicKey)
{
    if (err) console.log('\nFailed to read file\n\n', err, '\n');
    else
    {

        var createKeyOptions =
        {
            url : url + 'account/keys',
            method : 'POST',
            headers : headers,
            json :
            {
                'name' : 'Kubernetes Key',
                'public_key' : publicKey
            }
        };

        request(createKeyOptions, function(error, response, body)
        {
            if (error) console.log('\nFailed to create key\n\n', error, '\n');
            else
            {
                var kubernetesKeyId = body.ssh_key.id;

                var createMasterOptions =
                {
                    url : url + 'droplets',
                    method : 'POST',
                    headers : headers,
                    json :
                    {
                        'name' :  'Kubernetes-Master',
                        'region' : 'nyc1',
                        'size' : 's-2vcpu-4gb',
                        'image' : 'ubuntu-16-04-x64',
                        'ssh_keys' : [ kubernetesKeyId ],
                        'private_networking' : true,
                        'tags' : [ 'kubernetes-master' ]
                    }
                };

                request(createMasterOptions, function(error, response, body)
                {
                    if (error) console.log('\nFailed to create master droplet\n\n', error, '\n');
                    else
                    {
                        setTimeout(function()
                        {
                            var listMasterOptions =
                            {
                                url : url + 'droplets?tag_name=kubernetes-master',
                                method : 'GET',
                                headers : headers
                            };

                            request(listMasterOptions, function(error, response, body)
                            {
                                if (error) console.log('\nFailed to list master droplet\n\n', error, '\n');
                                else
                                {
                                    var masterIpAddress = JSON.parse(body).droplets[0].networks.v4[0].ip_address;

                                    var createSlavesOptions =
                                    {
                                        url : url + 'droplets',
                                        method : 'POST',
                                        headers : headers,
                                        json :
                                        {
                                            'names' : [ 'Kubernetes-Slave-One', 'Kubernetes-Slave-Two' ],
                                            'region' : 'nyc1',
                                            'size' : 's-2vcpu-4gb',
                                            'image' : 'ubuntu-16-04-x64',
                                            'ssh_keys' : [ kubernetesKeyId ],
                                            'private_networking' : true,
                                            'tags' : [ 'kubernetes-slave' ]
                                        }
                                    };

                                    request(createSlavesOptions, function(error, response, body)
                                    {
                                        if (error) console.log('\nFailed to to create slave droplets\n\n', error, '\n');
                                        else
                                        {
                                            setTimeout(function()
                                            {
                                                var listSlavesOptions =
                                                {
                                                    url : url + 'droplets?tag_name=kubernetes-slave',
                                                    method : 'GET',
                                                    headers : headers
                                                }

                                                request(listSlavesOptions, function(error, response, body)
                                                {
                                                    if (error) console.log('\n\nFailed to list slave droplets\n', error, '\n');
                                                    else
                                                    {
                                                        var slaveIpAddresses = [];

                                                        slaveIpAddresses[0] = JSON.parse(body).droplets[0].networks.v4[0].ip_address;
                                                        slaveIpAddresses[1] = JSON.parse(body).droplets[1].networks.v4[0].ip_address;

                                                        var inventory = '';

                                                        var inventoryOptions = ` ansible_ssh_user=root ansible_ssh_private_key_file=${__dirname}/do-key ansible_python_interpreter=/usr/bin/python3 ansible_ssh_common_args='-o StrictHostKeyChecking=no'`;

                                                        inventory += '[kubernetes-common]\n';
                                                        inventory += masterIpAddress + inventoryOptions + '\n';
                                                        inventory += slaveIpAddresses[0] + inventoryOptions + '\n';
                                                        inventory += slaveIpAddresses[1] + inventoryOptions + '\n\n';

                                                        inventory += '[kubernetes-master]\n';
                                                        inventory += masterIpAddress + inventoryOptions + '\n\n';

                                                        inventory += '[kubernetes-node1]\n';
                                                        inventory += slaveIpAddresses[0] + inventoryOptions + '\n\n';

                                                        inventory += '[kubernetes-node2]\n';
                                                        inventory += slaveIpAddresses[1] + inventoryOptions + '\n\n';

                                                        inventory += '[redis-common]\n';
                                                        inventory += masterIpAddress + inventoryOptions + '\n';
                                                        inventory += slaveIpAddresses[0] + inventoryOptions + '\n';
                                                        inventory += slaveIpAddresses[1] + inventoryOptions + '\n\n';

                                                        inventory += '[redis-master]\n';
                                                        inventory += masterIpAddress + inventoryOptions + '\n\n';

                                                        inventory += '[redis-slave]\n';
                                                        inventory += slaveIpAddresses[0] + inventoryOptions + '\n';
                                                        inventory += slaveIpAddresses[1] + inventoryOptions + '\n';

                                                        fs.writeFile(`${__dirname}/inventory-kubernetes`, inventory, function(error)
                                                        {
                                                            if(error) console.log('\nFailed to write inventory-kubernetes\n\n', error, '\n');
                                                        });
                                                    }
                                                });
                                            }, 60000);
                                        }
                                    });
                                }
                            });
                        }, 60000);
                    }
                });
            }
        });
    }
});
