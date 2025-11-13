# Telegram Bot Dashboard Design Guidelines

## Project Overview
A monitoring dashboard for a Telegram bot that forwards and synchronizes messages between channels. The interface provides real-time status monitoring, message logs, and configuration management.

## Color Palette

### Primary Colors
- **Primary Blue**: Used for bot status indicators, primary actions
- **Background**: Clean, minimal workspace (light gray in light mode, dark in dark mode)
- **Success Green**: For successful message forwards
- **Warning Amber**: For sync operations and edits
- **Destructive Red**: For errors and failed operations

## Typography
- **Font Family**: Open Sans (primary), system fallback
- **Headings**: Bold, clear hierarchy
- **Body**: Regular weight for readability
- **Code/IDs**: Monospace for message IDs, chat IDs

## Layout Structure

### Dashboard Layout
- **Header**: Bot status indicator, controls, theme toggle
- **Main Content Area**: 
  - Status cards showing statistics
  - Real-time activity log
  - Message forwarding monitor

### Spacing
- **Large gaps**: 24px (1.5rem) - Between major sections
- **Medium gaps**: 16px (1rem) - Between cards and groups
- **Small gaps**: 8px (0.5rem) - Between related items

## Components

### Status Cards
- Clean card design with subtle borders
- Icon + label + value layout
- Color-coded based on status

### Activity Log
- Scrollable list with timestamps
- Different styling for: new messages, edits, errors
- Monospaced font for IDs
- Badge indicators for message types

### Bot Control Panel
- Start/Stop toggle
- Configuration display
- Connection status indicator

## Visual Style
- **Borders**: Subtle, not prominent
- **Shadows**: Minimal, used only for elevation
- **Corners**: Moderately rounded (6px)
- **Icons**: Lucide React icons for consistency

## Interactions
- Hover states on interactive elements
- Loading states for async operations
- Smooth transitions (200ms)
- Real-time updates for logs

## Dark Mode
- Full dark mode support
- Proper contrast ratios maintained
- Status colors adjusted for dark backgrounds
