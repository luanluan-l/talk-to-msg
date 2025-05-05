/**
 * MasterGo MCP (Model Context Protocol) Server
 * MasterGo模型上下文协议服务器
 * 
 * 该文件实现了一个Model Context Protocol服务器，用于与MasterGo设计工具进行集成通信。
 * 主要功能包括：
 * 
 * 1. 通过WebSocket与MasterGo客户端建立连接
 * 2. 提供一系列工具和命令，允许用户进行MasterGo设计操作
 * 3. 创建、修改、删除MasterGo设计元素，如矩形、文本、框架等
 * 4. 管理设计元素的属性（颜色、位置、尺寸等）
 * 5. 支持频道机制，允许多客户端连接
 * 
 * 该服务器作为Cursor与MasterGo之间的桥梁，使用MCP协议处理请求和响应，
 * 允许AI助手直接与MasterGo进行交互，执行设计相关任务。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Define TypeScript interfaces for MasterGo responses
interface MasterGoResponse {
  id: string;
  result?: any;
  error?: string;
}

// Custom logging functions that write to stderr instead of stdout to avoid being captured
const logger = {
  info: (message: string) => process.stderr.write(`[INFO] ${message}\n`),
  debug: (message: string) => process.stderr.write(`[DEBUG] ${message}\n`),
  warn: (message: string) => process.stderr.write(`[WARN] ${message}\n`),
  error: (message: string) => process.stderr.write(`[ERROR] ${message}\n`),
  log: (message: string) => process.stderr.write(`[LOG] ${message}\n`)
};

// WebSocket connection and request tracking
let ws: WebSocket | null = null;
const pendingRequests = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: NodeJS.Timeout;
}>();

// Track which channel each client is in
let currentChannel: string | null = null;

// Create MCP server
const server = new McpServer({
  name: "TalkToMasterGo",
  version: "1.0.0",
});

// Add command line argument parsing
const args = process.argv.slice(2);
const serverArg = args.find(arg => arg.startsWith('--server='));
const serverUrl = serverArg ? serverArg.split('=')[1] : 'localhost';
const WS_URL = serverUrl === 'localhost' ? `ws://${serverUrl}` : `wss://${serverUrl}`;

// Document Info Tool
server.tool(
  "get_document_info",
  "Get detailed information about the current MasterGo document",
  {},
  async () => {
    try {
      const result = await sendCommandToMasterGo('get_document_info');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting document info: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Selection Tool
server.tool(
  "get_selection",
  "Get information about the current selection in MasterGo",
  {},
  async () => {
    try {
      const result = await sendCommandToMasterGo('get_selection');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting selection: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Node Info Tool
server.tool(
  "get_node_info",
  "Get detailed information about a specific node in MasterGo",
  {
    nodeId: z.string().describe("The ID of the node to get information about")
  },
  async ({ nodeId }: { nodeId: string }) => {
    try {
      const result = await sendCommandToMasterGo('get_node_info', { nodeId });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting node info: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Rectangle Tool
server.tool(
  "create_rectangle",
  "Create a new rectangle in MasterGo",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    width: z.number().describe("Width of the rectangle"),
    height: z.number().describe("Height of the rectangle"),
    name: z.string().optional().describe("Optional name for the rectangle"),
    parentId: z.string().optional().describe("Optional parent node ID to append the rectangle to")
  },
  async ({ x, y, width, height, name, parentId }: { x: number; y: number; width: number; height: number; name?: string; parentId?: string }) => {
    try {
      const result = await sendCommandToMasterGo('create_rectangle', {
        x, y, width, height, name: name || 'Rectangle', parentId
      });
      return {
        content: [
          {
            type: "text",
            text: `Created rectangle "${JSON.stringify(result)}"`
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating rectangle: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Ellipse Tool
server.tool(
  "create_ellipse",
  "Create a new ellipse in MasterGo",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    width: z.number().describe("Width of the ellipse"),
    height: z.number().describe("Height of the ellipse"),
    name: z.string().optional().describe("Optional name for the ellipse"),
    parentId: z.string().optional().describe("Optional parent node ID to append the ellipse to"),
    fillColor: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
    }).optional().describe("Fill color in RGBA format")
  },
  async ({ x, y, width, height, name, parentId, fillColor }) => {
    try {
      const result = await sendCommandToMasterGo('create_ellipse', {
        x, y, width, height, name: name || 'Ellipse', parentId, fillColor
      });
      return {
        content: [
          {
            type: "text",
            text: `Created ellipse "${JSON.stringify(result)}"`
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating ellipse: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Frame Tool
server.tool(
  "create_frame",
  "Create a new frame in MasterGo",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    width: z.number().describe("Width of the frame"),
    height: z.number().describe("Height of the frame"),
    name: z.string().optional().describe("Optional name for the frame"),
    parentId: z.string().optional().describe("Optional parent node ID to append the frame to"),
    fillColor: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
    }).optional().describe("Fill color in RGBA format"),
    strokeColor: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
    }).optional().describe("Stroke color in RGBA format"),
    strokeWeight: z.number().positive().optional().describe("Stroke weight")
  },
  async ({ x, y, width, height, name, parentId, fillColor, strokeColor, strokeWeight }) => {
    try {
      const result = await sendCommandToMasterGo('create_frame', {
        x, y, width, height, name: name || 'Frame', parentId,
        fillColor: fillColor || { r: 1, g: 1, b: 1, a: 1 },
        strokeColor: strokeColor,
        strokeWeight: strokeWeight
      });
      const typedResult = result as { name: string, id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created frame "${typedResult.name}" with ID: ${typedResult.id}. Use the ID as the parentId to appendChild inside this frame.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating frame: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Text Tool
server.tool(
  "create_text",
  "Create a new text element in MasterGo",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    text: z.string().describe("Text content"),
    fontSize: z.number().optional().describe("Font size (default: 14)"),
    fontWeight: z.number().optional().describe("Font weight (e.g., 400 for Regular, 700 for Bold)"),
    fontColor: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
    }).optional().describe("Font color in RGBA format"),
    name: z.string().optional().describe("Optional name for the text node by default following text"),
    parentId: z.string().optional().describe("Optional parent node ID to append the text to")
  },
  async ({ x, y, text, fontSize, fontWeight, fontColor, name, parentId }) => {
    try {
      const result = await sendCommandToMasterGo('create_text', {
        x, y, text,
        fontSize: fontSize || 14,
        fontWeight: fontWeight || 400,
        fontColor: fontColor || { r: 0, g: 0, b: 0, a: 1 },
        name: name || 'Text',
        parentId
      });
      const typedResult = result as { name: string, id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created text "${typedResult.name}" with ID: ${typedResult.id}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating text: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Fill Color Tool
server.tool(
  "set_fill_color",
  "Set the fill color of a node in MasterGo can be TextNode or FrameNode",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    r: z.number().min(0).max(1).describe("Red component (0-1)"),
    g: z.number().min(0).max(1).describe("Green component (0-1)"),
    b: z.number().min(0).max(1).describe("Blue component (0-1)"),
    a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
  },
  async ({ nodeId, r, g, b, a }) => {
    try {
      const result = await sendCommandToMasterGo('set_fill_color', {
        nodeId,
        color: { r, g, b, a: a || 1 }
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set fill color of node "${typedResult.name}" to RGBA(${r}, ${g}, ${b}, ${a || 1})`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting fill color: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Stroke Color Tool
server.tool(
  "set_stroke_color",
  "Set the stroke color of a node in MasterGo",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    r: z.number().min(0).max(1).describe("Red component (0-1)"),
    g: z.number().min(0).max(1).describe("Green component (0-1)"),
    b: z.number().min(0).max(1).describe("Blue component (0-1)"),
    a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
    weight: z.number().positive().optional().describe("Stroke weight")
  },
  async ({ nodeId, r, g, b, a, weight }) => {
    try {
      const result = await sendCommandToMasterGo('set_stroke_color', {
        nodeId,
        color: { r, g, b, a: a || 1 },
        weight: weight || 1
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set stroke color of node "${typedResult.name}" to RGBA(${r}, ${g}, ${b}, ${a || 1}) with weight ${weight || 1}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting stroke color: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Move Node Tool
server.tool(
  "move_node",
  "Move a node to a new position in MasterGo",
  {
    nodeId: z.string().describe("The ID of the node to move"),
    x: z.number().describe("New X position"),
    y: z.number().describe("New Y position")
  },
  async ({ nodeId, x, y }) => {
    try {
      const result = await sendCommandToMasterGo('move_node', { nodeId, x, y });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Moved node "${typedResult.name}" to position (${x}, ${y})`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error moving node: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Resize Node Tool
server.tool(
  "resize_node",
  "Resize a node in MasterGo",
  {
    nodeId: z.string().describe("The ID of the node to resize"),
    width: z.number().positive().describe("New width"),
    height: z.number().positive().describe("New height")
  },
  async ({ nodeId, width, height }) => {
    try {
      const result = await sendCommandToMasterGo('resize_node', { nodeId, width, height });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Resized node "${typedResult.name}" to width ${width} and height ${height}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error resizing node: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Delete Node Tool
server.tool(
  "delete_node",
  "Delete a node from MasterGo",
  {
    nodeId: z.string().describe("The ID of the node to delete")
  },
  async ({ nodeId }) => {
    try {
      const result = await sendCommandToMasterGo('delete_node', { nodeId });
      return {
        content: [
          {
            type: "text",
            text: `Deleted node with ID: ${nodeId}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting node: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Append Child Node Tool
server.tool(
  "append_child",
  "Append a child node to a parent node in MasterGo",
  {
    parentId: z.string().describe("The ID of the parent node to append to"),
    childId: z.string().describe("The ID of the child node to append")
  },
  async ({ parentId, childId }) => {
    try {
      const result = await sendCommandToMasterGo('append_child', { parentId, childId });
      return {
        content: [
          {
            type: "text",
            text: `Appended node ${childId} to parent ${parentId}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error appending child: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Insert Child Node Tool
server.tool(
  "insert_child",
  "Insert a child node at a specific index in a parent node in MasterGo",
  {
    parentId: z.string().describe("The ID of the parent node to insert into"),
    childId: z.string().describe("The ID of the child node to insert"),
    index: z.number().int().min(0).describe("The index at which to insert the child")
  },
  async ({ parentId, childId, index }) => {
    try {
      const result = await sendCommandToMasterGo('insert_child', { parentId, childId, index });
      return {
        content: [
          {
            type: "text",
            text: `Inserted node ${childId} into parent ${parentId} at index ${index}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error inserting child: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Find All Tool
server.tool(
  "find_all",
  "Find all nodes matching a callback in the node tree starting from the given node",
  {
    nodeId: z.string().describe("The ID of the node to start searching from"),
    nodeType: z.string().optional().describe("Optional node type to filter by (e.g., 'FRAME', 'TEXT', 'RECTANGLE', etc.)"),
    name: z.string().optional().describe("Optional node name to filter by")
  },
  async ({ nodeId, nodeType, name }) => {
    try {
      const result = await sendCommandToMasterGo('find_all', { 
        nodeId, 
        criteria: {
          nodeType,
          name
        }
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error finding nodes: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Find One Tool
server.tool(
  "find_one",
  "Find the first node matching a callback in the node tree starting from the given node",
  {
    nodeId: z.string().describe("The ID of the node to start searching from"),
    nodeType: z.string().optional().describe("Optional node type to filter by (e.g., 'FRAME', 'TEXT', 'RECTANGLE', etc.)"),
    name: z.string().optional().describe("Optional node name to filter by")
  },
  async ({ nodeId, nodeType, name }) => {
    try {
      const result = await sendCommandToMasterGo('find_one', { 
        nodeId, 
        criteria: {
          nodeType,
          name
        }
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error finding node: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Find Children Tool
server.tool(
  "find_children",
  "Find all direct child nodes matching a callback",
  {
    nodeId: z.string().describe("The ID of the parent node"),
    nodeType: z.string().optional().describe("Optional node type to filter by (e.g., 'FRAME', 'TEXT', 'RECTANGLE', etc.)"),
    name: z.string().optional().describe("Optional node name to filter by")
  },
  async ({ nodeId, nodeType, name }) => {
    try {
      const result = await sendCommandToMasterGo('find_children', { 
        nodeId, 
        criteria: {
          nodeType,
          name
        }
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error finding children: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Find All With Criteria Tool
server.tool(
  "find_all_with_criteria",
  "Find all nodes matching specific types within a node's subtree",
  {
    nodeId: z.string().describe("The ID of the node to start searching from"),
    types: z.array(z.string()).describe("Array of node types to search for (e.g., ['FRAME', 'TEXT'])")
  },
  async ({ nodeId, types }) => {
    try {
      const result = await sendCommandToMasterGo('find_all_with_criteria', { 
        nodeId, 
        criteria: {
          types
        }
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error finding nodes with criteria: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Get Children Tool
server.tool(
  "get_children",
  "Get all direct children of a node",
  {
    nodeId: z.string().describe("The ID of the node to get children from")
  },
  async ({ nodeId }) => {
    try {
      const result = await sendCommandToMasterGo('get_children', { 
        nodeId
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting children: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Get Styles Tool
server.tool(
  "get_styles",
  "Get all styles from the current MasterGo document",
  {},
  async () => {
    try {
      const result = await sendCommandToMasterGo('get_styles');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting styles: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Get Team Components Tool
server.tool(
  "get_team_components",
  "Get all team library components available in MasterGo",
  {},
  async () => {
    try {
      const result = await sendCommandToMasterGo('get_team_components');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting team components: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Component Instance Tool
server.tool(
  "create_component_instance",
  "Create an instance of a component in MasterGo",
  {
    componentKey: z.string().describe("Key of the component to instantiate"),
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    parentId: z.string().optional().describe("Optional parent node ID to append the instance to")
  },
  async ({ componentKey, x, y, parentId }) => {
    try {
      const params: any = { componentKey, x, y };
      if (parentId) params.parentId = parentId;
      
      const result = await sendCommandToMasterGo('create_component_instance', params);
      const typedResult = result as { name: string, id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created component instance "${typedResult.name}" with ID: ${typedResult.id}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating component instance: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Export Node as Image Tool
server.tool(
  "export_node_as_image",
  "Export a node as an image from MasterGo",
  {
    nodeId: z.string().describe("The ID of the node to export"),
    format: z.enum(["PNG", "JPG", "SVG", "PDF"]).optional().describe("Export format"),
    scale: z.number().positive().optional().describe("Export scale")
  },
  async ({ nodeId, format, scale }) => {
    try {
      const result = await sendCommandToMasterGo('export_node_as_image', {
        nodeId,
        format: format || 'PNG',
        scale: scale || 1
      });
      const typedResult = result as { imageData: string, mimeType: string };

      return {
        content: [
          {
            type: "image",
            data: typedResult.imageData,
            mimeType: typedResult.mimeType || "image/png"
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error exporting node as image: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Corner Radius Tool
server.tool(
  "set_corner_radius",
  "Set the corner radius of a node in MasterGo",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    radius: z.number().min(0).describe("Corner radius value"),
    corners: z.array(z.boolean()).length(4).optional().describe("Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]")
  },
  async ({ nodeId, radius, corners }) => {
    try {
      const result = await sendCommandToMasterGo('set_corner_radius', {
        nodeId,
        radius,
        corners: corners || [true, true, true, true]
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set corner radius of node "${typedResult.name}" to ${radius}px`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting corner radius: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Text Content Tool
server.tool(
  "set_text_content",
  "Set the text content of an existing text node in MasterGo",
  {
    nodeId: z.string().describe("The ID of the text node to modify"),
    text: z.string().describe("New text content")
  },
  async ({ nodeId, text }) => {
    try {
      const result = await sendCommandToMasterGo('set_text_content', { nodeId, text });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Updated text content of node "${typedResult.name}" to "${text}"`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting text content: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Define design strategy prompt
server.prompt(
  "design_strategy",
  "Best practices for working with MasterGo designs",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `When working with MasterGo designs, follow these best practices:

1. Start with Document Structure:
   - First use get_document_info() to understand the current document
   - Plan your layout hierarchy before creating elements
   - Create a main container frame for each screen/section

2. Naming Conventions:
   - Use descriptive, semantic names for all elements
   - Follow a consistent naming pattern (e.g., "Login Screen", "Logo Container", "Email Input")
   - Group related elements with meaningful names

3. Layout Hierarchy:
   - Create parent frames first, then add child elements
   - For forms/login screens:
     * Start with the main screen container frame
     * Create a logo container at the top
     * Group input fields in their own containers
     * Place action buttons (login, submit) after inputs
     * Add secondary elements (forgot password, signup links) last

4. Input Fields Structure:
   - Create a container frame for each input field
   - Include a label text above or inside the input
   - Group related inputs (e.g., username/password) together

5. Element Creation:
   - Use create_frame() for containers and input fields
   - Use create_text() for labels, buttons text, and links
   - Set appropriate colors and styles:
     * Use fillColor for backgrounds
     * Use strokeColor for borders
     * Set proper fontWeight for different text elements

6. Mofifying existing elements:
  - use set_text_content() to modify text content.

7. Visual Hierarchy:
   - Position elements in logical reading order (top to bottom)
   - Maintain consistent spacing between elements
   - Use appropriate font sizes for different text types:
     * Larger for headings/welcome text
     * Medium for input labels
     * Standard for button text
     * Smaller for helper text/links

8. Best Practices:
   - Verify each creation with get_node_info()
   - Use parentId to maintain proper hierarchy
   - Group related elements together in frames
   - Keep consistent spacing and alignment

Example Login Screen Structure:
- Login Screen (main frame)
  - Logo Container (frame)
    - Logo (image/text)
  - Welcome Text (text)
  - Input Container (frame)
    - Email Input (frame)
      - Email Label (text)
      - Email Field (frame)
    - Password Input (frame)
      - Password Label (text)
      - Password Field (frame)
  - Login Button (frame)
    - Button Text (text)
  - Helper Links (frame)
    - Forgot Password (text)
    - Don't have account (text)`
          }
        }
      ],
      description: "Best practices for working with MasterGo designs"
    };
  }
);

// 

type MasterGoCommand =
  | 'get_document_info'
  | 'get_selection'
  | 'get_node_info'
  | 'create_rectangle'
  | 'create_frame'
  | 'create_text'
  | 'create_ellipse'
  | 'set_fill_color'
  | 'set_stroke_color'
  | 'move_node'
  | 'resize_node'
  | 'delete_node'
  | 'get_styles'
  // | 'get_local_components'
  | 'get_team_components'
  | 'import_component_by_key'
  | 'import_component_set_by_key'
  | 'import_style_by_key'
  | 'create_component_instance'
  | 'export_node_as_image'
  | 'execute_code'
  | 'join'
  | 'set_corner_radius'
  | 'set_text_content'
  | 'get_component_properties'
  | 'set_component_properties'
  | 'add_component_property'
  | 'edit_component_property'
  | 'delete_component_property'
  | 'set_component_property_references'
  | 'set_font'
  // | 'load_font'
  | 'set_variant_properties'
  | 'get_variant_properties'
  | 'append_child'
  | 'insert_child'
  | 'find_all'
  | 'find_one'
  | 'find_children'
  | 'find_all_with_criteria'
  | 'get_children'
  | 'set_layout_mode'
  | 'set_node_sizing_mode';

// Helper function to process MasterGo node responses
function processMasterGoNodeResponse(result: unknown): any {
  if (!result || typeof result !== 'object') {
    return result;
  }

  // Check if this looks like a node response
  const resultObj = result as Record<string, unknown>;
  if ('id' in resultObj && typeof resultObj.id === 'string') {
    // It appears to be a node response, log the details
    logger.info(`Processed MasterGo node: ${resultObj.name || 'Unknown'} (ID: ${resultObj.id})`);

    if ('x' in resultObj && 'y' in resultObj) {
      logger.debug(`Node position: (${resultObj.x}, ${resultObj.y})`);
    }

    if ('width' in resultObj && 'height' in resultObj) {
      logger.debug(`Node dimensions: ${resultObj.width}×${resultObj.height}`);
    }
  }

  return result;
}

// Simple function to connect to MasterGo WebSocket server
function connectToMasterGo(port: number = 9509) {
  // If already connected, do nothing
  if (ws && ws.readyState === WebSocket.OPEN) {
    logger.info('Already connected to MasterGo');
    return;
  }

  const wsUrl = serverUrl === 'localhost' ? `${WS_URL}:${port}` : WS_URL;
  logger.info(`Connecting to MasterGo socket server at ${wsUrl}...`);
  ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    logger.info('Connected to MasterGo socket server');
    // Reset channel on new connection
    currentChannel = null;
  });

  ws.on('message', (data: any) => {
    try {
      const json = JSON.parse(data) as { message: MasterGoResponse };
      const myResponse = json.message;
      logger.debug(`Received message: ${JSON.stringify(myResponse)}`);
      logger.log('myResponse' + JSON.stringify(myResponse));

      // Handle response to a request
      if (myResponse.id && pendingRequests.has(myResponse.id) && myResponse.result) {
        const request = pendingRequests.get(myResponse.id)!;
        clearTimeout(request.timeout);

        if (myResponse.error) {
          logger.error(`Error from MasterGo: ${myResponse.error}`);
          request.reject(new Error(myResponse.error));
        } else {
          if (myResponse.result) {
            request.resolve(myResponse.result);
          }
        }

        pendingRequests.delete(myResponse.id);
      } else {
        // Handle broadcast messages or events
        logger.info(`Received broadcast message: ${JSON.stringify(myResponse)}`);
      }
    } catch (error) {
      logger.error(`Error parsing message: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ws.on('error', (error) => {
    logger.error(`Socket error: ${error}`);
  });

  ws.on('close', () => {
    logger.info('Disconnected from MasterGo socket server');
    ws = null;

    // Reject all pending requests
    for (const [id, request] of pendingRequests.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
      pendingRequests.delete(id);
    }

    // Attempt to reconnect
    logger.info('Attempting to reconnect in 2 seconds...');
    setTimeout(() => connectToMasterGo(port), 2000);
  });
}

// Function to join a channel
async function joinChannel(channelName: string): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected to MasterGo');
  }

  try {
    await sendCommandToMasterGo('join', { channel: channelName });
    currentChannel = channelName;
    logger.info(`Joined channel: ${channelName}`);
  } catch (error) {
    logger.error(`Failed to join channel: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// 添加Symbol.dispose的类型定义
declare global {
  interface Timer {
    [Symbol.dispose]?: () => void;
  }
}

// Function to send commands to MasterGo
function sendCommandToMasterGo(command: MasterGoCommand, params: unknown = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // If not connected, try to connect first
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectToMasterGo();
      reject(new Error('Not connected to MasterGo. Attempting to connect...'));
      return;
    }

    // Check if we need a channel for this command
    const requiresChannel = command !== 'join';
    if (requiresChannel && !currentChannel) {
      reject(new Error('Must join a channel before sending commands'));
      return;
    }

    const id = uuidv4();
    const request = {
      id,
      type: command === 'join' ? 'join' : 'message',
      ...(command === 'join' ? { channel: (params as any).channel } : { channel: currentChannel }),
      message: {
        id,
        command,
        params: {
          ...(params as any),
        }
      }
    };

    // Set timeout for request
    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        logger.error(`Request ${id} to MasterGo timed out after 30 seconds`);
        reject(new Error('Request to MasterGo timed out'));
      }
    }, 30000); // 30 second timeout

    // Store the promise callbacks to resolve/reject later
    pendingRequests.set(id, { resolve, reject, timeout });

    // Send the request
    logger.info(`Sending command to MasterGo: ${command}`);
    logger.debug(`Request details: ${JSON.stringify(request)}`);
    ws.send(JSON.stringify(request));
  });
}

// Update the join_channel tool
server.tool(
  "join_channel",
  "Join a specific channel to communicate with MasterGo",
  {
    channel: z.string().describe("The name of the channel to join").default("")
  },
  async ({ channel }) => {
    try {
      if (!channel) {
        // If no channel provided, ask the user for input
        return {
          content: [
            {
              type: "text",
              text: "Please provide a channel name to join:"
            }
          ],
          followUp: {
            tool: "join_channel",
            description: "Join the specified channel"
          }
        };
      }

      await joinChannel(channel);
      return {
        content: [
          {
            type: "text",
            text: `Successfully joined channel: ${channel}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error joining channel: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

async function handleCommand(command, params) {
  switch (command) {
    case "get_document_info":
      return await getDocumentInfo();
    // 其他命令...
    default:
      throw new Error(`未知命令: ${command}`);
  }
}

// Start the server
async function main() {
  try {
    // Try to connect to MasterGo socket server
    connectToMasterGo();
  } catch (error) {
    logger.warn(`Could not connect to MasterGo initially: ${error instanceof Error ? error.message : String(error)}`);
    logger.warn('Will try to connect when the first command is sent');
  }

  // Start the MCP server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MasterGoMCP server running on stdio');
}

// Run the server
main().catch(error => {
  logger.error(`Error starting MasterGoMCP server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

// 添加导入组件工具
server.tool(
  "import_component_by_key",
  "Import a component from team library by key, and include create instance. If the instance need to be appended to a parent node, please provide the parentId.",
  {
    ukey: z.string().describe("The unique key of the component to import"),
    properties: z.object({}).optional().describe("Initial properties to set on the instance"),
    x: z.number().optional().describe("X position for the created instance"),
    y: z.number().optional().describe("Y position for the created instance"),
    parentId: z.string().optional().describe("Optional parent node ID to append the instance to")
  },
  async ({ ukey, properties, x, y, parentId }) => {
    try {
      // logger.info(`导入组件: ${ukey}, 父节点: ${parentId}`);
      const params: any = { ukey };
      
      // 添加可选参数
      if (properties) params.properties = properties;
      if (x !== undefined) params.x = x;
      if (y !== undefined) params.y = y;
      if (parentId) params.parentId = parentId;
      
      const result = await sendCommandToMasterGo('import_component_by_key', params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error importing component: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// 添加导入组件集工具
server.tool(
  "import_component_set_by_key",
  "Import a component set from team library by key",
  {
    ukey: z.string().describe("The unique key of the component set to import"),
    parentId: z.string().optional().describe("Optional parent node ID to append the instance to")
  },
  async ({ ukey, parentId }) => {
    try {
      const params: any = { ukey };
      if (parentId) params.parentId = parentId;
      
      const result = await sendCommandToMasterGo('import_component_set_by_key', params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error importing component set: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// 添加导入样式工具
server.tool(
  "import_style_by_key",
  "Import a style from team library by key",
  {
    ukey: z.string().describe("The unique key of the style to import"),
    nodeId: z.string().optional().describe("Optional node ID to apply the style to")
  },
  async ({ ukey, nodeId }) => {
    try {
      const result = await sendCommandToMasterGo('import_style_by_key', { ukey, nodeId });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error importing style: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// 设置布局模式工具
server.tool(
  "set_layout_mode",
  "Set the layout mode and wrap behavior of a frame in MasterGo",
  {
    nodeId: z.string().describe("The ID of the frame to modify"),
    flexMode: z.enum(["NONE", "HORIZONTAL", "VERTICAL"]).describe("Layout mode for the frame"),
    flexWrap: z.enum(["NO_WRAP", "WRAP"]).optional().describe("Whether the auto-layout frame wraps its children"),
    itemSpacing: z.number().optional().describe("Distance between children in the primary axis"),
    crossAxisSpacing: z.union([z.number(), z.null()]).optional().describe("Distance between lines when flexWrap is WRAP. Set to null to sync with itemSpacing"),
    mainAxisAlignItems: z.enum(['FLEX_START', 'FLEX_END',  'CENTER', 'SPACING_BETWEEN']).optional().describe("Determine the alignment of the child nodes of the automatic layout container on the main axis"),
    crossAxisAlignItems: z.enum(['FLEX_START', 'FLEX_END',  'CENTER']).optional().describe("Counter axis alignmentDetermine the alignment of the child nodes of the automatic layout container on the cross axis"),
    crossAxisAlignContent: z.enum(["AUTO", "SPACE_BETWEEN"]).optional().describe("Determines how rows are distributed in a WRAP layout"),
    paddingTop: z.number().optional().describe("Top padding for auto-layout frame"),
    paddingRight: z.number().optional().describe("Right padding for auto-layout frame"),
    paddingBottom: z.number().optional().describe("Bottom padding for auto-layout frame"),
    paddingLeft: z.number().optional().describe("Left padding for auto-layout frame"),
    resizeToFit: z.boolean().optional().describe("When true, the node will resize to fit its content"),
    // layoutSizingHorizontal: z.enum(["FIXED", "HUG", "FILL"]).optional().describe("Horizontal sizing mode (HUG for frames/text only, FILL for auto-layout children only)"),
    // layoutSizingVertical: z.enum(["FIXED", "HUG", "FILL"]).optional().describe("Vertical sizing mode (HUG for frames/text only, FILL for auto-layout children only)"),
    itemReverseZIndex: z.boolean().optional().describe("When true, the first layer will be drawn on top"),
    strokesIncludedInLayout: z.boolean().optional().describe("When true, strokes are included in layout calculations (similar to CSS box-sizing: border-box)"),
    childrenFlexGrow: z.record(z.string(), z.number().int().min(0).max(1)).optional().describe("子节点flexGrow设置, key为子节点id, value为0或1"),
    childrenAlignSelf: z.record(z.string(), z.enum(["STRETCH", "INHERIT"])).optional().describe("子节点alignSelf设置, key为子节点id,value为STRETCH或INHERIT")
  },
  async ({ nodeId, flexMode, flexWrap, itemSpacing, crossAxisSpacing, mainAxisAlignItems, crossAxisAlignItems, crossAxisAlignContent, paddingTop, paddingRight, paddingBottom, paddingLeft, resizeToFit, itemReverseZIndex, strokesIncludedInLayout, childrenFlexGrow, childrenAlignSelf }) => {
    try {
      // 构建参数对象
      const params: any = { 
        nodeId, 
        flexMode
      };
      
      // 添加可选参数
      if (flexWrap !== undefined) params.flexWrap = flexWrap;
      if (itemSpacing !== undefined) params.itemSpacing = itemSpacing;
      if (crossAxisSpacing !== undefined) params.crossAxisSpacing = crossAxisSpacing;
      if (mainAxisAlignItems !== undefined) params.mainAxisAlignItems = mainAxisAlignItems;
      if (crossAxisAlignItems !== undefined) params.crossAxisAlignItems = crossAxisAlignItems;
      if (crossAxisAlignContent !== undefined) params.crossAxisAlignContent = crossAxisAlignContent;
      if (paddingTop !== undefined) params.paddingTop = paddingTop;
      if (paddingRight !== undefined) params.paddingRight = paddingRight;
      if (paddingBottom !== undefined) params.paddingBottom = paddingBottom;
      if (paddingLeft !== undefined) params.paddingLeft = paddingLeft;
      if (resizeToFit !== undefined) params.resizeToFit = resizeToFit;
      // if (layoutSizingHorizontal !== undefined) params.layoutSizingHorizontal = layoutSizingHorizontal;
      // if (layoutSizingVertical !== undefined) params.layoutSizingVertical = layoutSizingVertical;
      if (itemReverseZIndex !== undefined) params.itemReverseZIndex = itemReverseZIndex;
      if (strokesIncludedInLayout !== undefined) params.strokesIncludedInLayout = strokesIncludedInLayout;
      if (childrenFlexGrow !== undefined) params.childrenFlexGrow = childrenFlexGrow;
      if (childrenAlignSelf !== undefined) params.childrenAlignSelf = childrenAlignSelf;
      
      const result = await sendCommandToMasterGo('set_layout_mode', params);
      
      return {
        content: [
          {
            type: "text",
            text: `已设置节点 ${nodeId} 的布局模式为 ${flexMode}，其他相关属性也已更新。`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `设置布局模式失败: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// 获取组件属性工具
server.tool(
  "get_component_properties",
  "Get component properties from a component, instance, or node",
  {
    nodeId: z.string().describe("The ID of the node to get properties from")
  },
  async ({ nodeId }: { nodeId: string }) => {
    try {
      const result = await sendCommandToMasterGo('get_component_properties', { nodeId });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting component properties: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// 获取组件变体属性工具
server.tool(
  "get_variant_properties",
  "Get variant properties from a component instance",
  {
    nodeId: z.string().describe("The ID of the instance to get variant properties from")
  },
  async ({ nodeId }: { nodeId: string }) => {
    try {
      const result = await sendCommandToMasterGo('get_variant_properties', { nodeId });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting variant properties: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// 设置实例属性工具
server.tool(
  "set_component_properties",
  "Set component properties from a component, instance, or node",
  {
    nodeId: z.string().describe("The ID of the instance or component or node to modify"),
    properties: z.record(z.string(), z.union([z.string(), z.boolean()])).describe("Properties object with property IDs as keys and new values")
  },
  async ({ nodeId, properties }) => {
    try {
      const result = await sendCommandToMasterGo('set_component_properties', { nodeId, properties });
      return {
        content: [
          {
            type: "text",
            text: `Updated instance properties: ${JSON.stringify(result, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting instance properties: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// 设置组件变体属性工具
// server.tool(
//   "set_variant_properties",
//   "Set variant properties on a component instance to switch its main component",
//   {
//     nodeId: z.string().describe("The ID of the instance to modify"),
//     variantProperties: z.record(z.string(), z.string()).describe("Variant properties object with property names as keys and values")
//   },
//   async ({ nodeId, variantProperties }) => {
//     try {
//       const result = await sendCommandToMasterGo('set_variant_properties', { nodeId, variantProperties });
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Updated variant properties: ${JSON.stringify(result, null, 2)}`
//           }
//         ]
//       };
//     } catch (error) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Error setting variant properties: ${error instanceof Error ? error.message : String(error)}`
//           }
//         ]
//       };
//     }
//   }
// );

// 设置组件属性引用工具
server.tool(
  "set_component_property_references",
  "Set component property references on a node within a component",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    references: z.object({
      isVisible: z.string().optional().describe("Property ID to control visibility"),
      characters: z.string().optional().describe("Property ID to control text content (for text layers)"),
      mainComponent: z.string().optional().describe("Property ID to control main component (for instances)")
    }).describe("References to component properties")
  },
  async ({ nodeId, references }) => {
    try {
      const result = await sendCommandToMasterGo('set_component_property_references', { nodeId, references });
      return {
        content: [
          {
            type: "text",
            text: `Set component property references: ${JSON.stringify(result, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting component property references: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// 设置字体样式工具
server.tool(
  "set_font",
  "Set the font style for a text node in MasterGo",
  {
    nodeId: z.string().describe("The ID of the text node to modify"),
    fontName: z.union([
      z.string().describe("Font name as string (will use Regular style)"),
      z.object({
        family: z.string().describe("Font family name"),
        style: z.string().optional().describe("Font style (e.g., 'Regular', 'Bold', 'Italic')")
      }).describe("Font name object with family and optional style")
    ]).optional().describe("Font name object or string"),
    fontSize: z.number().optional().describe("Font size to set"),
    fontWeight: z.number().optional().describe("Font weight (e.g., 400 for Regular, 700 for Bold)"),
    start: z.number().min(0).optional().describe("Start position in the text (default: 0)"),
    end: z.number().optional().describe("End position in the text (default: text length)")
  },
  async ({ nodeId, fontName, fontSize, fontWeight, start, end }) => {
    try {
      // 处理fontName对象，确保正确传递
      let processedFontName = fontName;
      if (fontName && typeof fontName === 'object') {
        processedFontName = {
          family: fontName.family,
          style: fontName.style || 'Regular'
        };
      }

      const result = await sendCommandToMasterGo('set_font', { 
        nodeId, 
        fontName: processedFontName,
        fontSize,
        fontWeight,
        start: start !== undefined ? start : 0,
        end
      });
      
      // 构建响应消息
      let responseText = "设置样式成功：";
      
      // 处理字体信息
      if (fontName) {
        const fontInfo = typeof fontName === 'string' ? 
          { family: fontName, style: 'Regular' } : 
          { family: fontName.family, style: fontName.style || 'Regular' };
        responseText += `字体=${fontInfo.family} ${fontInfo.style}`;
      }
      
      // 处理字号信息
      if (fontSize !== undefined) {
        responseText += (fontName ? ", " : "") + `字号=${fontSize}`;
      }
      
      // 处理字重信息
      if (fontWeight !== undefined) {
        responseText += ((fontName || fontSize !== undefined) ? ", " : "") + `字重=${fontWeight}`;
      }
      
      // 处理范围信息
      if (start !== undefined) {
        const rangeText = end !== undefined ? 
          `文本范围：[${start}, ${end})` : 
          `文本范围：[${start}, 末尾)`;
        responseText += `, ${rangeText}`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `设置字体样式失败: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

//加载字体工具
//   server.tool(
//     "load_font",
//   "Load a font for use in MasterGo",
//   {
//     fontName: z.union([
//       z.string().describe("Font name as string (will use Regular style)"),
//       z.object({
//         family: z.string().describe("Font family name"),
//         style: z.string().optional().describe("Font style (e.g., 'Regular', 'Bold', 'Italic')")
//       }).describe("Font name object with family and optional style")
//     ]).describe("Font name object or string")
//   },
//   async ({ fontName }) => {
//     try {
//       // 处理字体名称参数，确保正确传递对象
//       let processedFontName;
//       if (typeof fontName === 'string') {
//         processedFontName = { family: fontName, style: 'Regular' };
//       } else if (fontName && typeof fontName === 'object') {
//         processedFontName = {
//           family: fontName.family,
//           style: fontName.style || 'Regular'
//         };
//       } else {
//         throw new Error("无效的字体名称格式");
//       }
      
//       const result = await sendCommandToMasterGo('load_font', { fontName: processedFontName });
      
//       return {
//         content: [
//           {
//             type: "text",
//             text: `字体加载成功：${processedFontName.family} ${processedFontName.style}`
//           }
//         ]
//       };
//     } catch (error) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: `加载字体失败: ${error instanceof Error ? error.message : String(error)}`
//           }
//         ]
//       };
//     }
//   }
// );

// 添加设置子节点宽高模式工具
server.tool(
  "set_node_sizing_mode",
  "设置自动布局容器的子节点的宽高模式(flexGrow、alignSelf)",
  {
    nodeId: z.string().describe("子节点的ID"),
    parentId: z.string().describe("父容器节点的ID，必须是自动布局容器"),
    flexGrow: z.number().int().min(0).max(1).optional().describe("是否充满主轴: 0表示固定宽度，1表示充满容器"),
    // resizeToFit: z.boolean().optional().describe("When true, the node will resize to fit its children"),
    alignSelf: z.enum(["STRETCH", "INHERIT"]).optional().describe("是否充满交叉轴: STRETCH表示撑满交叉轴，INHERIT表示固定高度")
  },
  async ({ nodeId, parentId, flexGrow, alignSelf }) => {
    try {
      const result = await sendCommandToMasterGo('set_node_sizing_mode', {
        nodeId,
        parentId,
        flexGrow: flexGrow !== undefined ? flexGrow : undefined,
        alignSelf: alignSelf || undefined,
      });
      
      // 准备响应信息
      let responseText = `已设置节点 ${nodeId} 的尺寸模式`;
      if (flexGrow !== undefined) {
        responseText += `，主轴模式：${flexGrow === 1 ? '充满容器' : '固定宽度'}`;
      }
      if (alignSelf) {
        responseText += `，交叉轴模式：${alignSelf === 'STRETCH' ? '撑满交叉轴' : '固定高度'}`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `设置节点尺寸模式失败: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);