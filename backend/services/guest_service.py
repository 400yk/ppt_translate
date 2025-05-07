"""
Module to track guest user translations by IP address.
Data is stored in the database.
"""

import datetime
from config import GUEST_TRANSLATION_LIMIT
from db.models import db, GuestTranslation

class GuestTracker:
    """
    Tracks guest user translations by IP address.
    Data is stored in the database using the GuestTranslation model.
    """
    
    def __init__(self):
        """Initialize the guest tracker using database storage."""
        pass
    
    def record_translation(self, ip_address, filename, src_lang, dest_lang, character_count=0):
        """
        Record a translation by a guest user.
        
        Args:
            ip_address: The IP address of the guest.
            filename: The name of the translated file.
            src_lang: The source language.
            dest_lang: The destination language.
            character_count: Optional count of characters translated.
            
        Returns:
            True if the translation was recorded, False if the user has
            exceeded their limit.
        """
        # Check if the IP has reached the limit
        if not self.can_translate(ip_address):
            return False
        
        # Record the translation in the database
        guest_translation = GuestTranslation(
            ip_address=ip_address,
            filename=filename,
            source_language=src_lang,
            target_language=dest_lang,
            character_count=character_count
        )
        
        db.session.add(guest_translation)
        db.session.commit()
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
        # Count all translations from this IP in the database
        total_count = GuestTranslation.count_by_ip(ip_address)
        return total_count < GUEST_TRANSLATION_LIMIT
    
    def get_remaining_translations(self, ip_address):
        """
        Get the number of translations remaining for a guest user.
        
        Args:
            ip_address: The IP address of the guest.
            
        Returns:
            Number of translations remaining.
        """
        # Count translations in the database
        total_count = GuestTranslation.count_by_ip(ip_address)
        return max(0, GUEST_TRANSLATION_LIMIT - total_count)

# Singleton instance
guest_tracker = GuestTracker() 