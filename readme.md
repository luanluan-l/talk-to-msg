# Special Notice

This project is modified based on [cursor-talk-to-figma-mcp](https://github.com/sonnylazuardi/cursor-talk-to-figma-mcp), originally created by Sonny Lazuardi.

# Cursor Talk To MSG Plugin MCP

This project implements a Model Context Protocol (MCP) integration between Cursor AI and Mastergo, allowing Cursor to communicate with Master go for reading designs and modifying them programmatically.


## Project Structure

- `src/talk_to_Mastergo_mcp/` - TypeScript MCP server for Mastergo integration
- `src/cursor_mcp_plugin/` - Mastergo plugin for communicating with Cursor
- `src/socket.ts` - WebSocket server that facilitates communication between the MCP server and Mastergo plugin

## Get Started

1. Install Bun if you haven't already:

```bash
curl -fsSL https://bun.sh/install | bash
```

2. Run setup, this will also install MCP in your Cursor's active project

```bash
bun setup
```

3. Start the Websocket server

```bash
bun start
```

4. Install [Mastergo Plugin](#Mastergo-plugin)


## Manual Setup and Installation

### MCP Server: Integration with Cursor

Add the server to your Cursor MCP configuration in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TalkToMastergo": {
      "command": "bun",
      "args": [
        "/path/to/cursor-talk-to-Mastergo-mcp/src/talk_to_Mastergo_mcp/server.ts"
      ]
    }
  }
}
```

### WebSocket Server

Start the WebSocket server:

```bash
bun run src/socket.ts
```

### Mastergo Plugin

1. In Mastergo, go to Plugins > Development > New Plugin
2. Choose "Link existing plugin"
3. Select the `src/cursor_mcp_plugin/manifest.json` file
4. The plugin should now be available in your Mastergo development plugins

## Usage

1. Start the WebSocket server
2. Install the MCP server in Cursor
3. Open Mastergo and run the Cursor MCP Plugin
4. Connect the plugin to the WebSocket server by joining a channel using `join_channel`
5. Use Cursor to communicate with Mastergo using the MCP tools

## MCP Tools

#### Document & Node Info
- `get_document_info`: Get detailed information about the current MasterGo document
- `get_selection`: Get information about the current selection
- `get_node_info`: Get detailed information about a specific node

#### Element Creation
- `create_rectangle`: Create a rectangle
- `create_frame`: Create a frame/artboard
- `create_text`: Create a text node
- `create_ellipse`: Create an ellipse

#### Node Modification
- `set_fill_color`: Set the fill color of a node
- `set_stroke_color`: Set the stroke color and weight of a node
- `move_node`: Move a node
- `resize_node`: Resize a node
- `delete_node`: Delete a node
- `set_corner_radius`: Set the corner radius
- `set_text_content`: Set the text content
- `set_font`: Set the font
- `set_layout_mode`: Set the auto-layout mode

#### Components & Styles
- `get_styles`: Get local styles
- `get_team_components`: Get team components
- `import_component_by_key`: Import a component by key
- `import_component_set_by_key`: Import a component set by key
- `import_style_by_key`: Import a style by key
- `create_component_instance`: Create a component instance
- `get_component_properties`: Get component properties
- `set_component_properties`: Set component properties
- `add_component_property`: Add a component property
- `edit_component_property`: Edit a component property
- `delete_component_property`: Delete a component property
- `set_component_property_references`: Set component property references
- `set_variant_properties`: Set variant properties
- `get_variant_properties`: Get variant properties

#### Node Tree Operations
- `append_child`: Append a child node
- `insert_child`: Insert a child node
- `find_all`: Find all matching nodes
- `find_one`: Find the first matching node
- `find_children`: Find direct child nodes
- `find_all_with_criteria`: Find all nodes by criteria
- `get_children`: Get all direct children

#### Export & Advanced
- `export_node_as_image`: Export a node as an image (PNG, JPG, SVG, PDF)
- `execute_code`: Execute arbitrary JavaScript code in MasterGo (use with caution)

#### Connection Management
- `join`: Join a channel

## Development

### Building the Mastergo Plugin

1. Navigate to the Mastergo plugin directory:

   ```
   cd src/cursor_mcp_plugin
   ```

2. Edit code.js and ui.html

## Best Practices

When working with the Mastergo MCP:

1. Always join a channel before sending commands
2. Get document overview using `get_document_info` first
3. Check current selection with `get_selection` before modifications
4. Use appropriate creation tools based on needs:
   - `create_frame` for containers
   - `create_rectangle` for basic shapes
   - `create_text` for text elements
5. Verify changes using `get_node_info`
6. Use component instances when possible for consistency
7. Handle errors appropriately as all commands can throw exceptions
