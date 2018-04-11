var fs = require('fs');

var instances = ['alpha', 'beta', 'charlie', 'echo', 'delta'];

console.log();

for (i = 0; i < instances.length; i++) {
    instance = instances[i];
    console.log(instance);
}

console.log();

if (fs.existsSync('/Users/timothydement')) console.log('\n/Users/timothydement exists\n');
else console.log('\n/Users/timothydement does not exist\n');

if (fs.existsSync('/Users/emilysdement')) console.log('\n/Users/emilydement exists\n');
else console.log('\n/Users/emilydement does not exist\n');

////////////////////////////////////////////////////////////////////////////////////////////////////

if (fs.existsSync('/home/ubuntu/JenkinsDeploy/itrust-cluster-inventory'))
{
    fs.open('/home/ubuntu/JenkinsDeploy/itrust-cluster-inventory', 'a', function(err)
    {
        if (err) console.log('Failed to open itrust-cluster-inventory file\n\n', err, '\n');
        else console.log('Successfully opened itrust-cluster-inventory file\n');

        var inventoryItem = publicIpAddress;
        inventoryItem += ` ansible_user=ubuntu`;
        inventoryItem += ` ansible_ssh_private_key_file=/home/ubuntu/JenkinsDeploy/itrust-${instance}.key`;
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
    inventory += ` ansible_ssh_private_key_file=/home/ubuntu/JenkinsDeploy/itrust-${instance}.key`;
    inventory += ` ansible_python_interpreter=/usr/bin/python3`;
    inventory += ` ansible_ssh_common_args='-o StrictHostKeyChecking=no'`;

    fs.writeFileSync('/home/ubuntu/JenkinsDeploy/itrust-cluster-inventory', inventory, function(err)
    {
        if (err) console.log('Failed to write inventory file\n\n', err, '\n');
        else console.log('Successfully wrote inventory file\n');
    });
}
