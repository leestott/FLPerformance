#!/usr/bin/env node

/**
 * Check Foundry Local installation and configuration
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 Foundry Local Diagnostic Check\n');

async function checkFoundryLocal() {
  console.log('1. Checking Foundry Local CLI...');
  
  const commands = [
    { cmd: 'foundry --version', name: 'foundry' },
    { cmd: 'foundry-local --version', name: 'foundry-local' },
    { cmd: 'fl --version', name: 'fl' }
  ];
  
  let found = false;
  let foundCmd = null;
  
  for (const { cmd, name } of commands) {
    try {
      const { stdout, stderr } = await execAsync(cmd);
      console.log(`✓ Found via "${name}" command`);
      console.log(`  Version: ${stdout.trim()}`);
      found = true;
      foundCmd = name;
      break;
    } catch (err) {
      console.log(`✗ "${name}" command not found`);
    }
  }
  
  if (!found) {
    console.log('\n❌ Foundry Local CLI not found in PATH\n');
    console.log('Installation instructions:');
    console.log('  Visit: https://aka.ms/foundry-local-installer');
    console.log('  Or check Microsoft Foundry Local documentation');
    return false;
  }
  
  console.log('\n2. Checking available commands...');
  
  try {
    const { stdout } = await execAsync(`${foundCmd} --help`);
    console.log('✓ Can access Foundry Local help');
    console.log('\nFoundry Local is installed and working');
  } catch (err) {
    console.log('⚠️  Could not access help');
    console.log('   Error:', err.message);
  }
  
  console.log('\n3. Checking service status...');
  
  try {
    const { stdout } = await execAsync(`${foundCmd} service status`);
    console.log('✓ Service status:');
    console.log(stdout);
  } catch (err) {
    console.log('⚠️  Could not check service status');
    console.log('   This is normal if service is not running');
  }
  
  console.log('\n✅ Diagnostic complete\n');
  console.log('If you see errors above, please:');
  console.log('  1. Verify Foundry Local is properly installed');
  console.log('  2. Check that the CLI is in your system PATH');
  console.log('  3. Try running Foundry Local commands manually');
  console.log('  4. Consult Foundry Local documentation\n');
  
  return true;
}

checkFoundryLocal();
