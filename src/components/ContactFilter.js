import React, { useState, useRef, useEffect, useMemo, memo } from 'react';

function ContactFilter({ contacts, selectedContacts, onSelectionChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const dropdownRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search input (150ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [search]);

  // Filter contacts - memoized with debounced search
  const filteredContacts = useMemo(() => {
    if (!debouncedSearch) return contacts;
    
    const searchLower = debouncedSearch.toLowerCase();
    return contacts.filter(c => {
      // Search by display name
      if (c.display_name?.toLowerCase().includes(searchLower)) return true;
      // Search by any identifier
      if (c.identifiers?.some(id => id.toLowerCase().includes(searchLower))) return true;
      return false;
    });
  }, [contacts, debouncedSearch]);

  const toggleContact = (contactId) => {
    if (selectedContacts.includes(contactId)) {
      onSelectionChange(selectedContacts.filter(c => c !== contactId));
    } else {
      onSelectionChange([...selectedContacts, contactId]);
    }
  };

  // Memoize contact display lookup
  const getContactDisplay = useMemo(() => {
    const displayMap = new Map();
    contacts.forEach(c => {
      const display = c.disambiguation 
        ? `${c.display_name} (${c.disambiguation})`
        : c.display_name;
      displayMap.set(c.contact_id, display);
    });
    return (contactId) => displayMap.get(contactId) || contactId;
  }, [contacts]);

  const clearAll = () => {
    onSelectionChange([]);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`btn h-10 px-3 text-sm flex items-center gap-2 ${
          selectedContacts.length > 0 ? 'btn-primary' : 'btn-outline'
        }`}
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {selectedContacts.length > 0 ? (
          <span>{selectedContacts.length} selected</span>
        ) : (
          <span>Filter by contact</span>
        )}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg z-50">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input h-8 text-sm"
              autoFocus
            />
          </div>

          {selectedContacts.length > 0 && (
            <div className="p-2 border-b flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {selectedContacts.map(contactId => (
                <span
                  key={contactId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full"
                >
                  <span className="truncate max-w-[140px]">{getContactDisplay(contactId)}</span>
                  <button
                    onClick={() => toggleContact(contactId)}
                    className="hover:bg-white/20 rounded-full p-0.5"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground px-2"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No contacts found
              </div>
            ) : (
              filteredContacts.map(contact => {
                const identifierCount = contact.identifiers?.length || 0;
                const mainIdentifier = contact.identifiers?.[0];
                const hasMultiple = identifierCount > 1;
                
                return (
                  <button
                    key={contact.contact_id}
                    onClick={() => toggleContact(contact.contact_id)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-accent/50 transition-colors ${
                      selectedContacts.includes(contact.contact_id) ? 'bg-accent/30' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium flex items-center gap-1.5">
                        {contact.display_name}
                        {contact.disambiguation && (
                          <span className="text-xs text-muted-foreground font-normal">
                            ({contact.disambiguation})
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {mainIdentifier}
                        {hasMultiple && (
                          <span className="ml-1 text-muted-foreground/70">
                            +{identifierCount - 1} more
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground">
                        {contact.message_count}
                      </span>
                      {selectedContacts.includes(contact.contact_id) && (
                        <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ContactFilter);
