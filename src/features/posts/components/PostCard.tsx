// // components/PostCard.tsx
// import { colorForId } from "@/utils/colorUtils";
// import { ImageBackground, Text, TouchableOpacity, View } from "react-native";
// import { PostCardStyles } from "./PostCard.styles"; // styles alag file

// export const PostCard = ({ post, onPressPost, onPressBook, onPressAstrologer }) => {
//   const bgColor = colorForId(post.astrologerId);

//   return (
//     <View style={PostCardStyles.postCard}>
//       {/* Header */}
//       <TouchableOpacity onPress={() => onPressAstrologer(post.astrologerId)}>
//         <View style={PostCardStyles.headerRow}>
//           <Avatar name={post.astrologerName} bgColor={bgColor} />
//           <View>
//              <Text>{post.astrologerName}</Text>
//              <Text style={PostCardStyles.tag}>Vedic</Text> {/* Fix: Tag add kiya */}
//           </View>
//           {/* 3-dot menu add karo */}
//           <Icon name="dots-vertical" size={24} /> 
//         </View>
//       </TouchableOpacity>

//       {/* Content: ImageBackground use karo overlay ke liye */}
//       <TouchableOpacity onPress={() => onPressPost(post.id)}>
//         <ImageBackground source={{ uri: post.mediaUrl }} style={PostCardStyles.postImage}>
//             {/* yahan content overlay karo */}
//             <Text style={PostCardStyles.overlayText}>{post.content}</Text>
//             {/* Logo aur Mahalaya text yahan add karo */}
//         </ImageBackground>
//       </TouchableOpacity>

//       {/* Footer: Like, Comment, Share, Date, Book Now */}
//       <View style={PostCardStyles.footer}>
//         <View style={PostCardStyles.leftActions}>
//            <Icon name="thumb-up" /> <Text>121</Text>
//            <Icon name="comment" /> <Text>22</Text>
//            <Icon name="share" /> <Text>3</Text>
//            {/* Date neeche lao */}
//            <Text style={PostCardStyles.date}>{new Date(post.createdAt).toLocaleDateString('en-IN', {...})}</Text>
//         </View>
//         <TouchableOpacity style={PostCardStyles.bookBtn} onPress={() => onPressBook(post)}>
//            <Text>Book Now</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// };