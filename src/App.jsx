import React, { useState } from 'react';
import { Container, Nav, Form, Button, Dropdown } from 'react-bootstrap';
import TwitterFeed from './components/TwitterFeed';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function SimpleApp() {
  const [activePlatform, setActivePlatform] = useState('twitter');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('new');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
  };

  const toggleSortDropdown = () => {
    setShowSortDropdown(!showSortDropdown);
  };

  const handleSortSelection = (sort) => {
    setSortBy(sort);
    setShowSortDropdown(false);
  };

  return (
    <div className="App">
      <Container>
        <header className="App-header my-4">
          <h1>Community Surf</h1>
          <p>Browse content from the Cursor community across different platforms</p>
        </header>

        {/* Search and Filter Controls */}
        <div className="controls-container mb-4">
          <Form onSubmit={handleSearch} className="d-flex">
            <Form.Control
              type="text"
              placeholder="Search for content..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="me-2"
            />
            <Button variant="primary" type="submit">Search</Button>
          </Form>

          <div className="filter-controls mt-3 d-flex">
            <div className="me-3">
              <Dropdown show={showSortDropdown} onToggle={toggleSortDropdown}>
                <Dropdown.Toggle variant="outline-secondary">
                  Sort: {sortBy === 'new' ? 'Newest' : sortBy === 'top' ? 'Top' : 'Hot'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleSortSelection('new')}>Newest</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleSortSelection('top')}>Top</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleSortSelection('hot')}>Hot</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Platform Navigation */}
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link 
              active={activePlatform === 'twitter'} 
              onClick={() => setActivePlatform('twitter')}
            >
              Twitter
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {/* Content Area */}
        <div className="content-area mb-5">
          {activePlatform === 'twitter' && (
            <TwitterFeed 
              searchTerm={searchTerm} 
              sortBy={sortBy} 
            />
          )}
        </div>
      </Container>

      <footer className="footer mt-auto py-3 bg-light">
        <Container className="text-center">
          <span className="text-muted">Community Surf &copy; 2023</span>
        </Container>
      </footer>
    </div>
  );
}

export default SimpleApp; 