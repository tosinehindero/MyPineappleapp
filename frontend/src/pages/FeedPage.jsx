import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { toast } from 'sonner';
import { 
  Send, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  MessageCircle,
  Heart,
  User,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const FeedPage = () => {
  const { user, profile } = useAuth();
  const { posts, loading, error, createPost } = usePosts();
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() || !user) return;

    setPosting(true);
    try {
      await createPost(newPost.trim(), user.uid, profile);
      setNewPost('');
      toast.success('Post created successfully!');
    } catch (err) {
      console.error('Failed to create post:', err);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-3">
            The Feed
          </h1>
          <p className="text-muted-foreground text-lg">
            What's happening in the community
          </p>
        </div>

        {/* Post Creation Box */}
        <div className="glass-card p-6" data-testid="post-creation-box">
          <form onSubmit={handleCreatePost}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center flex-shrink-0">
                {profile?.photoURL ? (
                  <img 
                    src={profile.photoURL} 
                    alt={profile.displayName} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share something with the community..."
                  className="glass-input w-full min-h-[100px] resize-none"
                  data-testid="post-input"
                />
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-muted-foreground">
                    {profile?.isVerified && (
                      <span className="inline-flex items-center gap-1 text-accent-cyan">
                        <CheckCircle2 className="w-4 h-4" />
                        Verified
                      </span>
                    )}
                  </span>
                  <button
                    type="submit"
                    disabled={!newPost.trim() || posting}
                    className="btn-primary flex items-center gap-2"
                    data-testid="post-submit-btn"
                  >
                    {posting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Post
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Posts List */}
        <div className="space-y-6" data-testid="posts-list">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">No posts yet</h3>
              <p className="text-muted-foreground">Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} formatDate={formatDate} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const PostCard = ({ post, formatDate }) => {
  const authorName = post.authorProfile?.displayName || 'Anonymous';
  const isVerified = post.authorProfile?.isVerified || false;

  return (
    <div 
      className="glass-card p-6 hover:border-white/20 transition-all duration-300"
      data-testid={`post-card-${post.id}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-cyan to-primary flex items-center justify-center flex-shrink-0">
          {post.authorProfile?.photoURL ? (
            <img 
              src={post.authorProfile.photoURL} 
              alt={authorName} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-white font-medium text-lg">
              {authorName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-foreground">{authorName}</span>
            {isVerified && (
              <CheckCircle2 className="w-4 h-4 text-accent-cyan" />
            )}
            <span className="text-muted-foreground text-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(post.createdAt)}
            </span>
          </div>
          
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-accent-pink transition-colors">
              <Heart className="w-5 h-5" />
              <span className="text-sm">{post.likes || 0}</span>
            </button>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-accent-cyan transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{post.comments?.length || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
