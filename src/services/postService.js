// src/services/postService.js
import api  from './api';

// Helper function to normalize MongoDB _id to id for frontend
const normalizeData = (data) => {
  if (!data) return null;
  
  if (Array.isArray(data)) {
    return data.map(item => ({
      id: item._id || item.id,
      ...item,
    }));
  }
  
  return {
    id: data._id || data.id,
    ...data
  };
};

// Helper function to create FormData for file uploads
const createFormData = (data, fileField, file) => {
  const formData = new FormData();
  
  // Add all the text fields
  Object.keys(data).forEach(key => {
    formData.append(key, data[key]);
  });
  
  // Add the file if provided
  if (file) {
    formData.append(fileField, file);
  }
  
  return formData;
};

// Helper function for multiple file uploads
const createMultiFileFormData = (data, fileField, files) => {
  const formData = new FormData();
  
  // Add all the text fields
  Object.keys(data).forEach(key => {
    formData.append(key, data[key]);
  });
  
  // Add files if provided
  if (Array.isArray(files) && files.length > 0) {
    files.forEach((file, index) => {
      formData.append(`${fileField}[${index}]`, file);
    });
  }
  
  return formData;
};

const postService = {
  // Get posts for feed or discovery
  getPosts: async (params = {}) => {
    try {
      console.log('Fetching posts with params:', params);
      const response = await api.get('/api/posts', params);
      
      // Log the raw response structure
      console.log('Response structure:', 
        typeof response === 'object' ? 
          Object.keys(response) : typeof response);
      
      // Check if we have a backend-style response
      let posts = [];
      
      if (response) {
        // Backend returns { status: 'success', data: { posts: [] } } format
        if (response.status === 'success' && response.data && response.data.posts) {
          console.log(`Found ${response.data.posts.length} posts in backend format`);
          posts = response.data.posts;
        } 
        // Direct array format
        else if (Array.isArray(response)) {
          console.log(`Found ${response.length} posts in array format`);
          posts = response;
        }
        // Data property contains array
        else if (response.data && Array.isArray(response.data)) {
          console.log(`Found ${response.data.length} posts in data array format`);
          posts = response.data;
        }
        // Data.data contains array (nested)
        else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          console.log(`Found ${response.data.data.length} posts in nested data format`);
          posts = response.data.data;
        }
        // Direct posts property
        else if (response.posts && Array.isArray(response.posts)) {
          console.log(`Found ${response.posts.length} posts in posts property`);
          posts = response.posts;
        }
        // Empty or invalid response
        else {
          console.log('No posts found in response, using empty array');
          posts = [];
        }
      }
      
      // If we have no posts, return empty array
      if (posts.length === 0) {
        console.log('No posts to process, returning empty array');
        return [];
      }
      
      // Log a sample post to see its structure
      if (posts.length > 0) {
        console.log('Sample post from API:', JSON.stringify({
          id: posts[0]._id || posts[0].id,
          author: posts[0].author,
          content: (posts[0].content || '').substring(0, 30) + '...',
          hasUser: !!posts[0].user,
          hasAuthor: !!posts[0].author
        }));
      }
      
      // Normalize the data with our utility
      const normalizedData = normalizeData(posts);
      
      // Process the posts to ensure they have required fields
      const processedData = Array.isArray(normalizedData) 
        ? normalizedData.map(post => {
            // Create enhanced post object
            const enhancedPost = {
              ...post,
              // Map known field name variations
              caption: post.content || post.caption || '',
              content: post.content || post.caption || '',
              // Set default values for required fields
              likes: post.likeCount !== undefined ? post.likeCount : (post.likes || 0),
              liked: post.likedByUser !== undefined ? post.likedByUser : (post.liked || false),
              bookmarked: post.bookmarkedByUser !== undefined ? post.bookmarkedByUser : (post.bookmarked || false),
              commentCount: post.commentCount || post.comments?.length || 0
            };
            
            // If post has no user object but has author, create user from author
            if (!enhancedPost.user && enhancedPost.author) {
              // Handle author as string ID or as object
              const authorId = typeof enhancedPost.author === 'object' ? 
                enhancedPost.author._id || enhancedPost.author.id : enhancedPost.author;
                
              const authorName = typeof enhancedPost.author === 'object' && enhancedPost.author.username ?
                enhancedPost.author.username : `User ${authorId.toString().substring(0, 5)}`;
                
              const authorImage = typeof enhancedPost.author === 'object' && enhancedPost.author.profileImage ?
                enhancedPost.author.profileImage : 'https://via.placeholder.com/40';
                
              // Create user object from author data
              enhancedPost.user = {
                id: authorId,
                username: authorName,
                profileImage: authorImage
              };
              
              console.log(`Created user object for post ${enhancedPost.id} using author data`);
            }
            
            // Ensure user has id field if user exists
            if (enhancedPost.user) {
              enhancedPost.user = {
                ...enhancedPost.user,
                id: enhancedPost.user.id || enhancedPost.user._id || 
                    (typeof enhancedPost.author === 'string' ? enhancedPost.author : null)
              };
            }
            
            return enhancedPost;
          })
        : [];
      
      // Log sample processed post
      if (processedData.length > 0) {
        console.log('Sample processed post:', JSON.stringify({
          id: processedData[0].id,
          user: processedData[0].user ? {
            id: processedData[0].user.id,
            username: processedData[0].user.username
          } : null,
          likes: processedData[0].likes,
          liked: processedData[0].liked,
          bookmarked: processedData[0].bookmarked,
          hasMedia: !!processedData[0].media?.length
        }));
      }
      
      return processedData;
    } catch (error) {
      console.error('Error fetching posts:', error.message);
      // Return empty array on error to prevent UI crashes
      return [];
    }
  },
  
  // Get user posts
  getUserPosts: async (userId) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // Add userId as query parameter
      const response = await api.get('/api/posts', { userId });
      
      // Check if we have a backend-style response
      let posts = [];
      
      if (response) {
        // Backend returns { status: 'success', data: { posts: [] } } format
        if (response.status === 'success' && response.data && response.data.posts) {
          posts = response.data.posts;
        } 
        // Direct array format
        else if (Array.isArray(response)) {
          posts = response;
        }
        // Data property contains array
        else if (response.data && Array.isArray(response.data)) {
          posts = response.data;
        }
        // Data.data contains array (nested)
        else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          posts = response.data.data;
        }
        // Direct posts property
        else if (response.posts && Array.isArray(response.posts)) {
          posts = response.posts;
        }
        // Empty or invalid response
        else {
          posts = [];
        }
      }
      
      // If we have no posts, return empty array
      if (posts.length === 0) {
        console.log(`No posts found for user ${userId}`);
        return [];
      }
      
      // Apply the same field normalization as in getPosts
      const normalizedData = normalizeData(posts);
      
      // Process the posts to ensure they have required fields
      return Array.isArray(normalizedData) 
        ? normalizedData.map(post => {
            // Create enhanced post object
            const enhancedPost = {
              ...post,
              // Map known field name variations
              caption: post.content || post.caption || '',
              content: post.content || post.caption || '',
              // Set default values for required fields
              likes: post.likeCount !== undefined ? post.likeCount : (post.likes || 0),
              liked: post.likedByUser !== undefined ? post.likedByUser : (post.liked || false),
              bookmarked: post.bookmarkedByUser !== undefined ? post.bookmarkedByUser : (post.bookmarked || false),
              commentCount: post.commentCount || post.comments?.length || 0
            };
            
            // If post has no user object but has author, create user from author
            if (!enhancedPost.user && enhancedPost.author) {
              // Handle author as string ID or as object
              const authorId = typeof enhancedPost.author === 'object' ? 
                enhancedPost.author._id || enhancedPost.author.id : enhancedPost.author;
                
              const authorName = typeof enhancedPost.author === 'object' && enhancedPost.author.username ?
                enhancedPost.author.username : `User ${authorId.toString().substring(0, 5)}`;
                
              const authorImage = typeof enhancedPost.author === 'object' && enhancedPost.author.profileImage ?
                enhancedPost.author.profileImage : 'https://via.placeholder.com/40';
                
              // Create user object from author data
              enhancedPost.user = {
                id: authorId,
                username: authorName,
                profileImage: authorImage
              };
            }
            
            // Ensure user has id field if user exists
            if (enhancedPost.user) {
              enhancedPost.user = {
                ...enhancedPost.user,
                id: enhancedPost.user.id || enhancedPost.user._id || 
                    (typeof enhancedPost.author === 'string' ? enhancedPost.author : null)
              };
            }
            
            return enhancedPost;
          })
        : [];
    } catch (error) {
      console.error(`Error fetching posts for user ${userId}:`, error.message);
      console.warn('API not available, returning empty posts array');
      return [];
    }
  },
  
  // Get post details
  getPost: async (postId) => {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      const response = await api.get(`/api/posts/${postId}`);
      
      // Handle different response formats
      let post = null;
      
      if (response) {
        if (response.status === 'success' && response.data) {
          // Backend returns {status: 'success', data: {}}
          post = response.data;
        } else if (response.data && response.data.data) {
          // Format: {data: {data: {}}}
          post = response.data.data;
        } else if (response.data) {
          // Direct post object
          post = response.data;
        }
      }
      
      if (!post) {
        throw new Error('Invalid post data received');
      }
      
      const normalizedData = normalizeData(post);
      
      // Create enhanced post object
      const enhancedPost = {
        ...normalizedData,
        // Map known field name variations
        caption: normalizedData.content || normalizedData.caption || '',
        content: normalizedData.content || normalizedData.caption || '',
        // Set default values for required fields
        likes: normalizedData.likeCount !== undefined ? normalizedData.likeCount : (normalizedData.likes || 0),
        liked: normalizedData.likedByUser !== undefined ? normalizedData.likedByUser : (normalizedData.liked || false),
        bookmarked: normalizedData.bookmarkedByUser !== undefined ? normalizedData.bookmarkedByUser : (normalizedData.bookmarked || false),
        commentCount: normalizedData.commentCount || normalizedData.comments?.length || 0
      };
      
      // If post has no user object but has author, create user from author
      if (!enhancedPost.user && enhancedPost.author) {
        // Handle author as string ID or as object
        const authorId = typeof enhancedPost.author === 'object' ? 
          enhancedPost.author._id || enhancedPost.author.id : enhancedPost.author;
          
        const authorName = typeof enhancedPost.author === 'object' && enhancedPost.author.username ?
          enhancedPost.author.username : `User ${authorId.toString().substring(0, 5)}`;
          
        const authorImage = typeof enhancedPost.author === 'object' && enhancedPost.author.profileImage ?
          enhancedPost.author.profileImage : 'https://via.placeholder.com/40';
          
        // Create user object from author data
        enhancedPost.user = {
          id: authorId,
          username: authorName,
          profileImage: authorImage
        };
      }
      
      // Ensure user has id field if user exists
      if (enhancedPost.user) {
        enhancedPost.user = {
          ...enhancedPost.user,
          id: enhancedPost.user.id || enhancedPost.user._id || 
              (typeof enhancedPost.author === 'string' ? enhancedPost.author : null)
        };
      }
      
      return enhancedPost;
    } catch (error) {
      console.error(`Error fetching post ${postId}:`, error.message);
      throw error;
    }
  },
  
  // Create a new post
  createPost: async (postData, mediaFiles = []) => {
    try {
      // Map content to what backend expects
      const backendPostData = {
        ...postData,
        content: postData.content || postData.caption || ''
      };
      
      let response;
      
      if (mediaFiles && mediaFiles.length > 0) {
        // Create FormData for media upload
        const formData = createMultiFileFormData(backendPostData, 'media', mediaFiles);
        
        // Log FormData for debugging
        console.log('FormData created for post with media. Files count:', mediaFiles.length);
        
        // Send request with media
        response = await api.post('/api/posts', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Send text-only post
        response = await api.post('/api/posts', backendPostData);
      }
      
      // Handle different response formats
      let post = null;
      
      if (response) {
        if (response.status === 'success' && response.data) {
          // Backend returns {status: 'success', data: {}}
          post = response.data;
        } else if (response.data && response.data.data) {
          // Format: {data: {data: {}}}
          post = response.data.data;
        } else if (response.data) {
          // Direct post object
          post = response.data;
        }
      }
      
      if (!post) {
        throw new Error('Invalid post data received');
      }
      
      const normalizedData = normalizeData(post);
      
      // Apply the same field mapping
      const enhancedPost = {
        ...normalizedData,
        // Map known field name variations
        caption: normalizedData.content || normalizedData.caption || '',
        content: normalizedData.content || normalizedData.caption || '',
        // Set default values for required fields
        likes: normalizedData.likeCount !== undefined ? normalizedData.likeCount : (normalizedData.likes || 0),
        liked: normalizedData.likedByUser !== undefined ? normalizedData.likedByUser : (normalizedData.liked || false),
        bookmarked: normalizedData.bookmarkedByUser !== undefined ? normalizedData.bookmarkedByUser : (normalizedData.bookmarked || false)
      };
      
      // If post has no user object but has author, create user from author
      if (!enhancedPost.user && enhancedPost.author) {
        // Handle author as string ID or as object
        const authorId = typeof enhancedPost.author === 'object' ? 
          enhancedPost.author._id || enhancedPost.author.id : enhancedPost.author;
          
        const authorName = typeof enhancedPost.author === 'object' && enhancedPost.author.username ?
          enhancedPost.author.username : `User ${authorId.toString().substring(0, 5)}`;
          
        const authorImage = typeof enhancedPost.author === 'object' && enhancedPost.author.profileImage ?
          enhancedPost.author.profileImage : 'https://via.placeholder.com/40';
          
        // Create user object from author data
        enhancedPost.user = {
          id: authorId,
          username: authorName,
          profileImage: authorImage
        };
      }
      
      // Ensure user has id field if user exists
      if (enhancedPost.user) {
        enhancedPost.user = {
          ...enhancedPost.user,
          id: enhancedPost.user.id || enhancedPost.user._id || 
              (typeof enhancedPost.author === 'string' ? enhancedPost.author : null)
        };
      }
      
      return enhancedPost;
    } catch (error) {
      console.error('Error creating post:', error.message);
      throw error;
    }
  },
  
  // React to a post (like/unlike)
  reactToPost: async (postId, reactionType) => {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      if (!reactionType) {
        throw new Error('Reaction type is required');
      }
      
      const response = await api.post(`/api/posts/${postId}/react`, { type: reactionType });
      return response;
    } catch (error) {
      console.error(`Error reacting to post ${postId}:`, error.message);
      throw error;
    }
  },
  
  // Bookmark a post
  bookmarkPost: async (postId) => {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      const response = await api.post(`/api/posts/${postId}/bookmark`);
      return response;
    } catch (error) {
      console.error(`Error bookmarking post ${postId}:`, error.message);
      throw error;
    }
  },
  
  // Remove bookmark from a post
  removeBookmark: async (postId) => {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      const response = await api.delete(`/api/posts/${postId}/bookmark`);
      return response;
    } catch (error) {
      console.error(`Error removing bookmark from post ${postId}:`, error.message);
      throw error;
    }
  },
  
  // Add comment to a post
  addComment: async (postId, commentData) => {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      const response = await api.post(`/api/posts/${postId}/comments`, commentData);
      return normalizeData(response);
    } catch (error) {
      console.error(`Error adding comment to post ${postId}:`, error.message);
      throw error;
    }
  },
  
  // Get comments for a post
  getComments: async (postId, params = {}) => {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      const response = await api.get(`/api/posts/${postId}/comments`, params);
      return normalizeData(response);
    } catch (error) {
      console.error(`Error fetching comments for post ${postId}:`, error.message);
      throw error;
    }
  },
  
  // Delete a post
  deletePost: async (postId) => {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }
      await api.delete(`/api/posts/${postId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting post ${postId}:`, error.message);
      throw error;
    }
  },
  
  // Get trending posts
  getTrendingPosts: async (params = {}) => {
    try {
      const response = await api.get('/api/posts/trending', params);
      
      // Check if we have a backend-style response
      let posts = [];
      
      if (response) {
        // Backend returns { status: 'success', data: { posts: [] } } format
        if (response.status === 'success' && response.data && response.data.posts) {
          posts = response.data.posts;
        } 
        // Direct array format
        else if (Array.isArray(response)) {
          posts = response;
        }
        // Data property contains array
        else if (response.data && Array.isArray(response.data)) {
          posts = response.data;
        }
        // Data.data contains array (nested)
        else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          posts = response.data.data;
        }
        // Direct posts property
        else if (response.posts && Array.isArray(response.posts)) {
          posts = response.posts;
        }
        // Empty or invalid response
        else {
          posts = [];
        }
      }
      
      // If we have no posts, return empty array
      if (posts.length === 0) {
        console.log('No trending posts found');
        return [];
      }
      
      const normalizedData = normalizeData(posts);
      
      // Process the posts to ensure they have required fields
      return Array.isArray(normalizedData)
        ? normalizedData.map(post => {
            // Create enhanced post object
            const enhancedPost = {
              ...post,
              // Map known field name variations
              caption: post.content || post.caption || '',
              content: post.content || post.caption || '',
              // Set default values for required fields
              likes: post.likeCount !== undefined ? post.likeCount : (post.likes || 0),
              liked: post.likedByUser !== undefined ? post.likedByUser : (post.liked || false),
              bookmarked: post.bookmarkedByUser !== undefined ? post.bookmarkedByUser : (post.bookmarked || false),
              commentCount: post.commentCount || post.comments?.length || 0
            };
            
            // If post has no user object but has author, create user from author
            if (!enhancedPost.user && enhancedPost.author) {
              // Handle author as string ID or as object
              const authorId = typeof enhancedPost.author === 'object' ? 
                enhancedPost.author._id || enhancedPost.author.id : enhancedPost.author;
                
              const authorName = typeof enhancedPost.author === 'object' && enhancedPost.author.username ?
                enhancedPost.author.username : `User ${authorId.toString().substring(0, 5)}`;
                
              const authorImage = typeof enhancedPost.author === 'object' && enhancedPost.author.profileImage ?
                enhancedPost.author.profileImage : 'https://via.placeholder.com/40';
                
              // Create user object from author data
              enhancedPost.user = {
                id: authorId,
                username: authorName,
                profileImage: authorImage
              };
            }
            
            // Ensure user has id field if user exists
            if (enhancedPost.user) {
              enhancedPost.user = {
                ...enhancedPost.user,
                id: enhancedPost.user.id || enhancedPost.user._id || 
                    (typeof enhancedPost.author === 'string' ? enhancedPost.author : null)
              };
            }
            
            return enhancedPost;
          })
        : [];
    } catch (error) {
      console.error('Error fetching trending posts:', error.message);
      return [];
    }
  },
};

export default postService;