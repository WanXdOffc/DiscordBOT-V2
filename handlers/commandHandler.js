const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  const commandFolders = ['admin', 'user', 'panel', 'utility'];
  
  for (const folder of commandFolders) {
    const commandsPath = path.join(__dirname, '..', 'commands', folder);
    
    // Check if folder exists
    if (!fs.existsSync(commandsPath)) {
      console.log(`Creating commands/${folder} directory...`);
      fs.mkdirSync(commandsPath, { recursive: true });
      continue;
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name} from ${folder}`);
      } else {
        console.log(`⚠️  [WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
      }
    }
  }
  
  console.log(`📝 Total commands loaded: ${client.commands.size}`);
};