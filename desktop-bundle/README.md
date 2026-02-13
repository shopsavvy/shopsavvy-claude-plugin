# ShopSavvy Desktop Bundle

This directory contains the Claude Desktop extension bundle (.mcpb) for ShopSavvy.

## Building the Bundle

1. Install the MCPB CLI:
   ```bash
   npm install -g @anthropic-ai/mcpb
   ```

2. Build the bundle:
   ```bash
   mcpb pack
   ```

3. This creates `shopsavvy.mcpb` which users can double-click to install.

## Distribution

The built `.mcpb` file should be:
- Uploaded to `https://shopsavvy.com/downloads/shopsavvy.mcpb`
- Linked from the `/agents` page

## User Installation

Users can install by:
1. Downloading `shopsavvy.mcpb`
2. Double-clicking the file
3. Claude Desktop opens and prompts to install
4. Done!

No manual JSON editing required.
