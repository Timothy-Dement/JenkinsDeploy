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
