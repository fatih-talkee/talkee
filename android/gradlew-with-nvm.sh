#!/bin/bash

# Wrapper script for gradlew that ensures nvm node is in PATH
# This script sources nvm and then runs gradlew with the correct PATH

# Source nvm if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Ensure node is in PATH
if [ -d "$HOME/.nvm/versions/node/v22.12.0/bin" ]; then
  export PATH="$HOME/.nvm/versions/node/v22.12.0/bin:$PATH"
fi

# Run gradlew with all arguments
exec ./gradlew "$@"

