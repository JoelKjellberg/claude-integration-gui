#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main installation
main() {
    print_header "Claude Code GUI Installer"

    # Check for Node.js
    print_info "Checking for Node.js..."
    if ! command_exists node; then
        print_error "Node.js is not installed!"
        print_info "Please install Node.js (v18 or higher) from https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required (current: $(node -v))"
        exit 1
    fi
    print_success "Node.js $(node -v) detected"

    # Detect package manager
    print_info "Detecting package manager..."
    PACKAGE_MANAGER=""
    if command_exists pnpm; then
        PACKAGE_MANAGER="pnpm"
    elif command_exists yarn; then
        PACKAGE_MANAGER="yarn"
    elif command_exists npm; then
        PACKAGE_MANAGER="npm"
    else
        print_error "No package manager found (npm, yarn, or pnpm required)"
        exit 1
    fi
    print_success "Using $PACKAGE_MANAGER"

    # Determine installation directory
    INSTALL_DIR="${INSTALL_DIR:-$HOME/claude-code-gui}"

    # Check if we're running in the repo or need to clone
    if [ -f "package.json" ] && grep -q "claude-code-gui" package.json 2>/dev/null; then
        print_info "Running in existing repository"
        INSTALL_DIR="$(pwd)"
    else
        print_info "Installation directory: $INSTALL_DIR"

        # Clone repository if it doesn't exist
        if [ ! -d "$INSTALL_DIR" ]; then
            print_info "Cloning repository..."
            if command_exists git; then
                REPO_URL="${REPO_URL:-https://github.com/JoelKjellberg/claude-integration-gui.git}"
                git clone "$REPO_URL" "$INSTALL_DIR"
                print_success "Repository cloned"
            else
                print_error "Git is not installed. Please install Git or manually download the repository."
                exit 1
            fi
        else
            print_warning "Directory already exists, skipping clone"
        fi

        cd "$INSTALL_DIR"
    fi

    # Install dependencies
    print_info "Installing dependencies..."
    case $PACKAGE_MANAGER in
        pnpm)
            pnpm install
            ;;
        yarn)
            yarn install
            ;;
        npm)
            npm install
            ;;
    esac
    print_success "Dependencies installed"

    # Create .gitignore if it doesn't exist
    if [ ! -f .gitignore ]; then
        print_info "Creating .gitignore..."
        cat > .gitignore << 'EOF'
node_modules/
.next/
.env*.local
dist/
.DS_Store
EOF
        print_success ".gitignore created"
    fi

    # Success message
    print_header "Installation Complete!"

    echo -e "${GREEN}Claude Code GUI has been successfully installed!${NC}"
    echo ""
    echo "To start the application:"
    echo ""
    if [ "$(pwd)" != "$INSTALL_DIR" ]; then
        echo -e "  ${YELLOW}cd $INSTALL_DIR${NC}"
    fi

    case $PACKAGE_MANAGER in
        pnpm)
            echo -e "  ${YELLOW}pnpm dev${NC}          # Development mode"
            echo -e "  ${YELLOW}pnpm build${NC}        # Production build"
            echo -e "  ${YELLOW}pnpm start${NC}        # Production server"
            ;;
        yarn)
            echo -e "  ${YELLOW}yarn dev${NC}          # Development mode"
            echo -e "  ${YELLOW}yarn build${NC}        # Production build"
            echo -e "  ${YELLOW}yarn start${NC}        # Production server"
            ;;
        npm)
            echo -e "  ${YELLOW}npm run dev${NC}       # Development mode"
            echo -e "  ${YELLOW}npm run build${NC}     # Production build"
            echo -e "  ${YELLOW}npm start${NC}         # Production server"
            ;;
    esac

    echo ""
    echo "The application will be available at:"
    echo -e "  ${BLUE}http://localhost:3000${NC}"
    echo ""
    print_info "Note: You'll need your Anthropic API key when using the application"
    echo ""
}

# Run main function
main