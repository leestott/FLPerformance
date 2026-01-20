#!/bin/bash
# FLPerformance Installation Script (Bash)
# This script installs all dependencies for FLPerformance on macOS/Linux

set -e

echo "======================================"
echo " FLPerformance Installation Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check Node.js
echo -e "${GREEN}📦 Step 1: Checking Node.js...${NC}"
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js is installed: ${NODE_VERSION}${NC}"
    
    # Extract major version
    MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo -e "${YELLOW}⚠️  Warning: Node.js version 18 or higher is recommended. You have: ${NODE_VERSION}${NC}"
    fi
else
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo -e "${YELLOW}   Please install Node.js 18 or higher from: https://nodejs.org/${NC}"
    exit 1
fi
echo ""

# Step 2: Check npm
echo -e "${GREEN}📦 Step 2: Checking npm...${NC}"
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm is installed: v${NPM_VERSION}${NC}"
else
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
fi
echo ""

# Step 3: Check Foundry Local
echo -e "${GREEN}📦 Step 3: Checking Foundry Local...${NC}"
FOUNDRY_INSTALLED=false

for cmd in foundry foundry-local fl; do
    if command_exists "$cmd"; then
        FOUNDRY_VERSION=$("$cmd" --version 2>&1 || echo "unknown")
        echo -e "${GREEN}✅ Foundry Local is installed via '$cmd': ${FOUNDRY_VERSION}${NC}"
        FOUNDRY_INSTALLED=true
        break
    fi
done

if [ "$FOUNDRY_INSTALLED" = false ]; then
    echo -e "${RED}❌ Foundry Local is not installed!${NC}"
    echo ""
    
    # Check OS for installation instructions
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${YELLOW}   Install on macOS using Homebrew:${NC}"
        echo -e "${CYAN}   brew install microsoft/foundrylocal/foundrylocal${NC}"
        echo ""
        echo -e "${YELLOW}   Or visit: https://aka.ms/foundry-local-installer${NC}"
        echo ""
        
        read -p "Do you want to install Foundry Local now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if command_exists brew; then
                echo -e "${GREEN}Installing Foundry Local via Homebrew...${NC}"
                brew install microsoft/foundrylocal/foundrylocal
            else
                echo -e "${RED}Homebrew is not installed. Please install manually.${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}   Installation instructions: https://aka.ms/foundry-local-installer${NC}"
    fi
    
    if [ "$FOUNDRY_INSTALLED" = false ]; then
        echo -e "${YELLOW}⚠️  FLPerformance requires Foundry Local to function!${NC}"
    fi
fi
echo ""

# Step 4: Install root dependencies
echo -e "${GREEN}📦 Step 4: Installing root dependencies...${NC}"
echo "   Using --no-optional to skip native modules that require build tools"
if npm install --no-optional; then
    echo -e "${GREEN}✅ Root dependencies installed successfully${NC}"
    echo "   Note: Results will be saved as JSON files (SQLite database skipped)"
else
    echo -e "${RED}❌ Failed to install root dependencies${NC}"
    exit 1
fi
echo ""

# Step 5: Install client dependencies
echo -e "${GREEN}📦 Step 5: Installing client dependencies...${NC}"
cd src/client
if npm install; then
    echo -e "${GREEN}✅ Client dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install client dependencies${NC}"
    cd ../..
    exit 1
fi
cd ../..
echo ""

# Step 6: Verify foundry-local-sdk installation
echo -e "${GREEN}📦 Step 6: Verifying foundry-local-sdk...${NC}"
if [ -d "node_modules/foundry-local-sdk" ]; then
    echo -e "${GREEN}✅ foundry-local-sdk is installed${NC}"
else
    echo -e "${RED}❌ foundry-local-sdk is not installed!${NC}"
    echo -e "${YELLOW}   Installing foundry-local-sdk...${NC}"
    npm install foundry-local-sdk
fi
echo ""

# Step 7: Create results directory
echo -e "${GREEN}📁 Step 7: Creating results directory...${NC}"
if [ ! -d "results" ]; then
    mkdir -p results
    echo -e "${GREEN}✅ Created results directory${NC}"
else
    echo -e "${GREEN}✅ Results directory already exists${NC}"
fi
echo ""

# Step 8: Test Foundry Local SDK
echo -e "${GREEN}🧪 Step 8: Testing Foundry Local integration...${NC}"
cat > test-foundry-temp.mjs << 'EOF'
import { FoundryLocalManager } from 'foundry-local-sdk';

try {
  const manager = new FoundryLocalManager();
  const isRunning = await manager.isServiceRunning();
  if (isRunning) {
    console.log('✅ Foundry Local service is running');
    const endpoint = manager.endpoint;
    console.log('   Endpoint:', endpoint);
  } else {
    console.log('⚠️  Foundry Local service is not running');
    console.log('   Run: foundry service start');
  }
} catch (error) {
  console.log('❌ Error testing Foundry Local:', error.message);
}
EOF

node test-foundry-temp.mjs || echo -e "${YELLOW}⚠️  Could not test Foundry Local integration${NC}"
rm -f test-foundry-temp.mjs
echo ""

# Summary
echo "======================================"
echo " Installation Summary"
echo "======================================"
echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Ensure Foundry Local is installed and in your PATH"
echo "2. Start the application:"
echo -e "   ${CYAN}npm run dev${NC}"
echo ""
echo "3. Or run in production mode:"
echo -e "   ${CYAN}npm run build${NC}"
echo -e "   ${CYAN}npm start${NC}"
echo ""
echo -e "${YELLOW}For more information, see README.md${NC}"
echo ""
