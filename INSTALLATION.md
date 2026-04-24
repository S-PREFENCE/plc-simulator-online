# Mobile PLC Programming Framework - Installation Guide

## Overview
This is a mobile-friendly PLC programming framework that allows users to create ladder logic diagrams similar to Siemens S7-1200/博图 v16 on a mobile device. The framework includes:

- Visual ladder diagram editor with drag-and-drop functionality
- Support for basic PLC instructions (contacts, coils, timers, counters, etc.)
- Simulation engine to test ladder logic
- Mobile-optimized interface

## Prerequisites
- Python 3.7 or higher
- pip package manager

## Installation Issues

Unfortunately, there appears to be an issue with the pip installation process on your system. You may encounter a recursion error when trying to install packages:

```
RecursionError: maximum recursion depth exceeded
```

## Manual Installation Steps

Due to the pip issue, please try the following alternative approaches:

### Option 1: Use a Different Python Environment
1. Install Python from the official website (python.org) if you haven't already
2. Ensure that the new Python installation is in your PATH
3. Try running: `python -m pip install -r requirements.txt`

### Option 2: Use Conda (if available)
1. Install Anaconda or Miniconda
2. Create a new environment: `conda create -n plc-framework python=3.9`
3. Activate the environment: `conda activate plc-framework`
4. Install dependencies: `conda install flask flask-cors numpy`

### Option 3: Manual Package Installation
If pip is completely unusable, you can try:
1. Download the packages manually from PyPI
2. Extract and install using: `python setup.py install`

## Required Dependencies
The application requires the following packages:
- Flask==2.3.3
- flask-cors==4.0.0
- numpy==1.24.3

## Running the Application

Once dependencies are installed:

1. Navigate to the backend directory:
   ```
   cd D:\A-open claw\Learn\mobile_plc_framework\backend
   ```

2. Start the server:
   ```
   python app.py
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Features

### Ladder Diagram Editor
- Drag-and-drop interface for placing PLC instructions
- Support for various instruction types:
  - Basic: Contacts (NO/NC), Coils
  - Timers: TON (On-Delay), TOF (Off-Delay)
  - Counters: CTU (Up Counter)
  - Data: MOVE, Comparison operators (=, >, <)

### Mobile Optimization
- Touch-friendly interface designed for mobile devices
- Responsive layout that adapts to screen size
- Large buttons and controls for easy interaction

### Simulation Engine
- Real-time simulation of ladder logic
- Variable monitoring panel
- Input toggling for testing scenarios

### Project Management
- Create, save, and load ladder diagram projects
- Copy and duplicate rungs (ladder rows)
- Export functionality for sharing projects

## Architecture

The framework follows a client-server architecture:

### Backend (Python/Flask)
- Handles project management
- Compiles ladder diagrams to executable logic
- Manages simulation engine
- Provides REST APIs for frontend communication

### Frontend (HTML/CSS/JavaScript)
- Visual ladder diagram editor using SVG
- Mobile-optimized interface
- Real-time simulation monitoring
- Touch gesture support for mobile interactions

## Troubleshooting

### Common Issues
1. **Port Already in Use**: If you get a port binding error, change the port in app.py
2. **Missing Dependencies**: Ensure all required packages are installed
3. **Cross-Origin Issues**: The flask-cors package should handle these automatically

### Mobile Access
To access the application from a mobile device on the same network:
1. Find your computer's IP address
2. Access: http://[YOUR_IP]:5000 from your mobile browser

## Contributing

This framework is designed to be extensible. Feel free to add:
- Additional PLC instruction types
- Advanced simulation features
- Improved mobile UX
- New visualization options

## License

This project is open-source and available under the MIT license.