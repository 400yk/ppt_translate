#!/usr/bin/env python3
"""
Script to update the invitation_code table schema to remove max_uses and uses columns
that are no longer needed with the new single-use invitation code system.
"""

import os
import sys
import sqlite3
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get the directory of this script
current_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(current_dir, 'app.db')

def check_and_update_invitation_code_table():
    """
    Check if max_uses and uses columns exist in the invitation_code table 
    and remove them if needed.
    """
    logger.info(f"Checking invitation_code table in {db_path}")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if the invitation_code table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='invitation_code'")
        if not cursor.fetchone():
            logger.error("invitation_code table does not exist")
            return False
        
        # Get current schema of invitation_code table
        cursor.execute("PRAGMA table_info(invitation_code)")
        columns = {column[1]: column for column in cursor.fetchall()}
        
        # Check if the columns to be removed exist
        columns_to_remove = []
        if 'max_uses' in columns:
            columns_to_remove.append('max_uses')
        if 'uses' in columns:
            columns_to_remove.append('uses')
        
        if not columns_to_remove:
            logger.info("No columns need to be removed. Schema is already updated.")
            return True
        
        # SQLite doesn't support dropping columns directly, so we need to:
        # 1. Create a new table without the unwanted columns
        # 2. Copy data from the old table to the new one
        # 3. Drop the old table
        # 4. Rename the new table to the original name
        
        logger.info(f"Removing columns: {', '.join(columns_to_remove)}")
        
        # Create a list of columns to keep
        columns_to_keep = [col for col in columns.keys() if col not in columns_to_remove]
        
        # Start transaction
        cursor.execute("BEGIN TRANSACTION")
        
        # Create new table without the unwanted columns
        create_table_sql = "CREATE TABLE invitation_code_new ("
        create_table_sql += ", ".join([f"{col} {columns[col][2]}" for col in columns_to_keep])
        
        # Add primary key constraints and other column constraints
        for col in columns_to_keep:
            col_info = columns[col]
            if col_info[5] == 1:  # Is primary key
                create_table_sql = create_table_sql.replace(f"{col} {col_info[2]}", f"{col} {col_info[2]} PRIMARY KEY")
            if col_info[3] == 1:  # Not null constraint
                create_table_sql = create_table_sql.replace(f"{col} {col_info[2]}", f"{col} {col_info[2]} NOT NULL")
            if col_info[4] is not None:  # Default value
                create_table_sql = create_table_sql.replace(f"{col} {col_info[2]}", f"{col} {col_info[2]} DEFAULT {col_info[4]}")
            
        create_table_sql += ")"
        cursor.execute(create_table_sql)
        
        # Copy data from old table to new table
        insert_sql = f"INSERT INTO invitation_code_new SELECT {', '.join(columns_to_keep)} FROM invitation_code"
        cursor.execute(insert_sql)
        
        # Drop old table
        cursor.execute("DROP TABLE invitation_code")
        
        # Rename new table to original name
        cursor.execute("ALTER TABLE invitation_code_new RENAME TO invitation_code")
        
        # Commit transaction
        conn.commit()
        logger.info("Successfully updated invitation_code table schema")
        
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating invitation_code table: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    try:
        if check_and_update_invitation_code_table():
            logger.info("Schema update completed successfully")
        else:
            logger.error("Schema update failed")
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc() 