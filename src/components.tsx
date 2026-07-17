import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './theme';

export function Brand({small=false}:{small?:boolean}){return <View style={s.brand}><Text style={[s.mark,small&&{fontSize:24}]}>X</Text><Text style={[s.brandText,small&&{fontSize:13}]}>XAVI-OS</Text></View>}
export function Pill({children,color=C.cyan}:{children:React.ReactNode;color?:string}){return <View style={[s.pill,{borderColor:color+'55',backgroundColor:color+'12'}]}><Text style={[s.pillText,{color}]}>{children}</Text></View>}
export function Button({title,onPress,secondary=false,disabled=false}:{title:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}){return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,pressed&&{transform:[{scale:.98}]},disabled&&{opacity:.4}]}><Text style={s.buttonText}>{title}</Text><Text style={s.arrow}>→</Text></Pressable>}
export function SectionTitle({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}){return <View style={s.sectionTitle}><Text style={s.sectionText}>{title}</Text>{action&&<Pressable onPress={onAction}><Text style={s.action}>{action}</Text></Pressable>}</View>}
const s=StyleSheet.create({
 brand:{flexDirection:'row',alignItems:'center',gap:8},mark:{fontSize:34,color:C.cyan,textShadowColor:C.violet,textShadowRadius:14},brandText:{color:C.text,fontWeight:'800',fontSize:18,letterSpacing:4},
 pill:{borderWidth:1,borderRadius:20,paddingHorizontal:10,paddingVertical:5,alignSelf:'flex-start'},pillText:{fontSize:10,fontWeight:'800'},
 button:{height:54,borderRadius:28,backgroundColor:C.violet,flexDirection:'row',alignItems:'center',justifyContent:'center',marginTop:12,shadowColor:C.violet,shadowOpacity:.45,shadowRadius:14},secondary:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line},buttonText:{color:'#fff',fontWeight:'800',fontSize:15},arrow:{color:'#fff',marginLeft:10,fontSize:17},
 sectionTitle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:22,marginBottom:10},sectionText:{color:C.text,fontWeight:'800',fontSize:16},action:{color:C.cyan,fontSize:12,fontWeight:'700'}
});
export const shared=s;
