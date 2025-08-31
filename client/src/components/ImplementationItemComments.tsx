import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Trash2, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";

interface Comment {
  id: string;
  itemId: string;
  projectId: string;
  authorId: string;
  text: string;
  visibleToClient: boolean;
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
}

interface ImplementationItemCommentsProps {
  itemId: string;
  projectId: string;
}

export function ImplementationItemComments({ itemId, projectId }: ImplementationItemCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [newComment, setNewComment] = useState("");
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isDirector = user?.role === 'director';
  const isClient = user?.role === 'client';
  const isMaster = user?.role === 'master';

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/implementation-items/${itemId}/comments`],
    enabled: !!itemId
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: { text: string; visibleToClient: boolean }) => {
      return await apiRequest(`/api/implementation-items/${itemId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      setNewComment("");
      setVisibleToClient(false);
      queryClient.invalidateQueries({ queryKey: [`/api/implementation-items/${itemId}/comments`] });
      toast({
        title: language === 'ru' ? "Комментарий добавлен" : "Comment added",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ru' ? "Ошибка" : "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return await apiRequest(`/api/implementation-item-comments/${commentId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/implementation-items/${itemId}/comments`] });
      toast({
        title: language === 'ru' ? "Комментарий удален" : "Comment deleted",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ru' ? "Ошибка" : "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addCommentMutation.mutateAsync({
        text: newComment,
        visibleToClient: isClient ? true : visibleToClient
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (commentId: string) => {
    if (confirm(language === 'ru' ? "Удалить комментарий?" : "Delete comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const canDelete = (comment: Comment) => {
    // Мастера не могут удалять комментарии вообще
    if (user?.role === 'master') return false;
    return isAdmin || comment.authorId === user?.id;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'director': return 'bg-blue-500';
      case 'master': return 'bg-green-500';
      case 'client': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: string) => {
    if (language === 'ru') {
      switch (role) {
        case 'admin': return 'Админ';
        case 'director': return 'Директор';
        case 'master': return 'Мастер';
        case 'client': return 'Клиент';
        default: return role;
      }
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            {language === 'ru' ? 'Загрузка комментариев...' : 'Loading comments...'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {language === 'ru' ? 'Комментарии' : 'Comments'} ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add comment form */}
        <div className="space-y-3">
          <Textarea
            placeholder={language === 'ru' ? 'Написать комментарий...' : 'Write a comment...'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          
          {!isClient && (
            <div className="flex items-center gap-2">
              <Switch
                id="visible-to-client"
                checked={visibleToClient}
                onCheckedChange={setVisibleToClient}
              />
              <Label htmlFor="visible-to-client" className="flex items-center gap-1 cursor-pointer">
                {visibleToClient ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {language === 'ru' ? 'Видно клиенту' : 'Visible to client'}
              </Label>
            </div>
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {language === 'ru' ? 'Отправить' : 'Send'}
          </Button>
        </div>

        {/* Comments list */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              {language === 'ru' ? 'Нет комментариев' : 'No comments'}
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs text-white ${getRoleBadgeColor(comment.author.role)}`}>
                      {getRoleLabel(comment.author.role)}
                    </span>
                    <span className="font-medium">{comment.author.name}</span>
                    {comment.visibleToClient && (
                      <span title={language === 'ru' ? 'Видно клиенту' : 'Visible to client'}>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </span>
                    )}
                  </div>
                  {canDelete(comment) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                    locale: language === 'ru' ? ru : enUS
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}