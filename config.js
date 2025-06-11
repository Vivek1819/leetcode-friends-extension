window.LeetCodeFriendsConfig = {
  API_BASE_URL: 'http://localhost:5000/api/users',
  SUBMISSIONS_PAGE_URL: 'https://leetcode.com/submissions/',
  FRIENDS_API: {
    GET_FRIENDS: (username) => `http://localhost:5000/api/users/${username}/friends`,
    ADD_FRIEND: (username) => `http://localhost:5000/api/users/${username}/add-friend`,
    REMOVE_FRIEND: (username) => `http://localhost:5000/api/users/${username}/remove-friend`
  }
};
