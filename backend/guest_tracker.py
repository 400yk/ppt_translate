"""
Module to track guest user translations by IP address.
"""

import json
import os
import datetime
from pathlib import Path
from config import GUEST_TRANSLATION_LIMIT

class GuestTracker:
    """
    Tracks guest user translations by IP address.
    Data is stored in a JSON file.
    """
    
    def __init__(self, data_file=None):
        """
        Initialize the guest tracker.
        
        Args:
            data_file: Path to the data file. If None, uses 'guest_translations.json' in the same directory.
        """
        if data_file is None:
            # Use default path in the same directory as this file
            self.data_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'guest_translations.json')
        else:
            self.data_file = data_file
            
        # Create the file if it doesn't exist
        if not os.path.exists(self.data_file):
            with open(self.data_file, 'w') as f:
                json.dump({}, f)
        
        # Load the data
        self.load_data()
    
    def load_data(self):
        """Load the guest translation data from the file."""
        try:
            with open(self.data_file, 'r') as f:
                self.data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            # If the file is empty or invalid, start with an empty dict
            self.data = {}
    
    def save_data(self):
        """Save the guest translation data to the file."""
        with open(self.data_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def record_translation(self, ip_address, filename, src_lang, dest_lang):
        """
        Record a translation by a guest user.
        
        Args:
            ip_address: The IP address of the guest.
            filename: The name of the translated file.
            src_lang: The source language.
            dest_lang: The destination language.
            
        Returns:
            True if the translation was recorded, False if the user has
            exceeded their limit.
        """
        # Check if the IP has reached the limit
        if not self.can_translate(ip_address):
            return False
        
        # Record the translation
        if ip_address not in self.data:
            self.data[ip_address] = []
        
        self.data[ip_address].append({
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'filename': filename,
            'src_lang': src_lang,
            'dest_lang': dest_lang
        })
        
        # Save the updated data
        self.save_data()
        return True
    
    def can_translate(self, ip_address):
        """
        Check if a guest user can perform another translation.
        Guest users only get GUEST_TRANSLATION_LIMIT translations *ever*.
        
        Args:
            ip_address: The IP address of the guest.
            
        Returns:
            True if the user can translate, False otherwise.
        """
        # If IP not in data, they can translate
        if ip_address not in self.data:
            return True
        
        # Count all translations from this IP, regardless of time
        total_count = len(self.data[ip_address])
        
        return total_count < GUEST_TRANSLATION_LIMIT
    
    def get_remaining_translations(self, ip_address):
        """
        Get the number of translations remaining for a guest user.
        
        Args:
            ip_address: The IP address of the guest.
            
        Returns:
            Number of translations remaining.
        """
        # If IP not in data, they have the full limit
        if ip_address not in self.data:
            return GUEST_TRANSLATION_LIMIT
        
        # Count all translations, regardless of time
        total_count = len(self.data[ip_address])
        
        return max(0, GUEST_TRANSLATION_LIMIT - total_count)

# Singleton instance
guest_tracker = GuestTracker() 